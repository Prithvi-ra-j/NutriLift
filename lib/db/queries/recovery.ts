import { eq, gte, lte, and, desc } from "drizzle-orm";
import { db } from "../client";
import { recoveryLogs, supplementLogs, type RecoveryLog, type NewRecoveryLog, type SupplementLog } from "../schema";
import { USER_PROFILE } from "../../constants/user-profile";
import { addCalendarDays, fromLocalDateKey, toLocalDateKey } from "../../utils/local-date";
import { validateRecoveryInput, summarizeRecoveryCheckIn, type RecoverySummary } from "../../recovery/validation";
import { appendDomainEvent } from "./domain-events";
import { enqueueRecoveryLog } from "./sync-outbox";

// ─── Recovery Queries ─────────────────────────────────────────────────────────

function assertCalendarDate(date: string): void {
  try {
    fromLocalDateKey(date);
  } catch {
    throw new Error("Recovery date must be a valid YYYY-MM-DD calendar date.");
  }
}

export async function getRecoveryLog(date: string): Promise<RecoveryLog | null> {
  assertCalendarDate(date);
  const result = await db
    .select()
    .from(recoveryLogs)
    .where(eq(recoveryLogs.date, date))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertRecoveryLog(log: NewRecoveryLog): Promise<void> {
  assertCalendarDate(log.date);
  validateRecoveryInput(log);
  const record = { ...log, updated_at: new Date().toISOString() };

  // Canonical recovery row, event journal and invalidation queue commit together.
  await db.transaction(async (tx: any) => {
    await tx.insert(recoveryLogs).values(record).onConflictDoUpdate({
      target: recoveryLogs.date,
      set: {
        sleep_duration_hr: log.sleep_duration_hr ?? null,
        sleep_quality: log.sleep_quality ?? null,
        bedtime: log.bedtime ?? null,
        wake_time: log.wake_time ?? null,
        hrv: log.hrv ?? null,
        resting_hr: log.resting_hr ?? null,
        energy_level: log.energy_level ?? null,
        muscle_soreness: log.muscle_soreness ?? null,
        stress_level: log.stress_level ?? null,
        notes: log.notes ?? null,
        updated_at: record.updated_at,
      },
    });
    await appendDomainEvent(tx, {
      id: `recovery-check-in:${log.date}:${record.updated_at}`,
      eventType: "recovery.check-in.saved",
      entityType: "recovery_log",
      entityId: log.date,
      entityVersion: Date.now(),
      occurredAt: record.updated_at,
      metadata: { date: log.date, hasSleepDuration: log.sleep_duration_hr != null },
    });
    const persistedRows = await tx.select().from(recoveryLogs).where(eq(recoveryLogs.date, log.date)).limit(1);
    if (persistedRows[0]) await enqueueRecoveryLog(tx, persistedRows[0]);
  });
}

export async function getRecentRecoveryLogs(days: number = 7): Promise<RecoveryLog[]> {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("Recovery history days must be an integer from 1 to 365.");
  }
  // Inclusive range: seven days means today plus the six preceding dates.
  const cutoffStr = addCalendarDays(toLocalDateKey(), -(days - 1));

  return db
    .select()
    .from(recoveryLogs)
    .where(gte(recoveryLogs.date, cutoffStr))
    .orderBy(recoveryLogs.date);
}

export async function getRecoveryLogsForDateRange(
  startDate: string,
  endDate: string
): Promise<RecoveryLog[]> {
  assertCalendarDate(startDate);
  assertCalendarDate(endDate);
  if (startDate > endDate) throw new Error("Recovery range start must not be after its end.");
  return db
    .select()
    .from(recoveryLogs)
    .where(
      and(
        gte(recoveryLogs.date, startDate),
        lte(recoveryLogs.date, endDate)
      )
    )
    .orderBy(recoveryLogs.date);
}

// ─── Supplement Queries ───────────────────────────────────────────────────────

export async function getSupplementLogsForDate(date: string): Promise<SupplementLog[]> {
  return db
    .select()
    .from(supplementLogs)
    .where(eq(supplementLogs.date, date));
}

export async function upsertSupplementLog(
  date: string,
  supplementName: string,
  taken: boolean
): Promise<void> {
  assertCalendarDate(date);
  if (!supplementName.trim()) throw new Error("Supplement name is required.");

  const now = Math.floor(Date.now() / 1000);
  const { default: uuid } = await import("react-native-uuid");

  // Serialize the read/write pair so rapid repeated taps cannot create duplicate
  // date/name records in the local database.
  await db.transaction(async (tx: any) => {
    const existing = await tx
      .select()
      .from(supplementLogs)
      .where(eq(supplementLogs.date, date));

    const existingForSupplement = existing.find(
      (s: SupplementLog) => s.supplement_name === supplementName
    );

    let recordId: string;
    if (existingForSupplement) {
      recordId = existingForSupplement.id;
      await tx
        .update(supplementLogs)
        .set({ taken: taken ? 1 : 0, logged_at: now })
        .where(eq(supplementLogs.id, existingForSupplement.id));
    } else {
      recordId = uuid.v4() as string;
      await tx.insert(supplementLogs).values({
        id: recordId,
        date,
        supplement_name: supplementName,
        taken: taken ? 1 : 0,
        logged_at: now,
      });
    }
    const eventVersion = Date.now();
    await appendDomainEvent(tx, {
      id: `supplement-log:${recordId}:${eventVersion}`,
      eventType: "recovery.supplement.updated",
      entityType: "supplement_log",
      entityId: recordId,
      entityVersion: eventVersion,
      occurredAt: new Date(eventVersion).toISOString(),
      metadata: { date, taken: Boolean(taken) },
    });
  });
}

export async function getSupplementAdherence30d(): Promise<Record<string, number>> {
  const cutoffStr = addCalendarDays(toLocalDateKey(), -29);

  const logs = await db
    .select()
    .from(supplementLogs)
    .where(gte(supplementLogs.date, cutoffStr));

  const adherence: Record<string, { taken: number; total: number }> = {};

  for (const supplement of USER_PROFILE.supplements) {
    adherence[supplement.name] = { taken: 0, total: 0 };
  }

  for (const log of logs) {
    if (adherence[log.supplement_name]) {
      adherence[log.supplement_name].total++;
      if (log.taken) adherence[log.supplement_name].taken++;
    }
  }

  const result: Record<string, number> = {};
  for (const [name, data] of Object.entries(adherence)) {
    result[name] = data.total > 0 ? (data.taken / data.total) * 100 : 0;
  }

  return result;
}


/** Blueprint contract alias: save one validated, user-reported check-in atomically. */
export async function saveRecoveryCheckIn(input: NewRecoveryLog): Promise<void> {
  return upsertRecoveryLog(input);
}

/** Return history with explicit inclusive date bounds. */
export async function getRecoveryHistory(startDate: string, endDate: string): Promise<RecoveryLog[]> {
  return getRecoveryLogsForDateRange(startDate, endDate);
}

/** Missing fields stay unknown; this function intentionally does not create a numeric readiness score. */
export async function getRecoverySummary(date: string): Promise<RecoverySummary> {
  const checkIn = await getRecoveryLog(date);
  return summarizeRecoveryCheckIn(checkIn, date);
}
