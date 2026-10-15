// @ts-nocheck
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { db } from "../client";
import { recoveryLogs, supplementLogs, type RecoveryLog, type NewRecoveryLog, type SupplementLog } from "../schema";
import { USER_PROFILE } from "../../constants/user-profile";
import { addCalendarDays, fromLocalDateKey, toLocalDateKey } from "../../utils/local-date";
import { validateRecoveryInput } from "../../recovery/validation";

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

  // Recovery is keyed by date. A single SQLite upsert prevents two rapid saves
  // from racing between a read and an insert on the same day.
  await db.insert(recoveryLogs).values(record).onConflictDoUpdate({
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

    if (existingForSupplement) {
      await tx
        .update(supplementLogs)
        .set({ taken: taken ? 1 : 0, logged_at: now })
        .where(eq(supplementLogs.id, existingForSupplement.id));
    } else {
      await tx.insert(supplementLogs).values({
        id: uuid.v4() as string,
        date,
        supplement_name: supplementName,
        taken: taken ? 1 : 0,
        logged_at: now,
      });
    }
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
