// @ts-nocheck
import { eq, gte, lte, and, desc, isNull } from "drizzle-orm";
import { db } from "../client";
import { recoveryLogs, supplementLogs, type RecoveryLog, type NewRecoveryLog, type SupplementLog } from "../schema";
import { inTx } from "../tx";
import { nowIso, nowUnix } from "../../time/clock";
import { addDays, localDateString } from "../../time/localDate";

// ─── Recovery Queries ─────────────────────────────────────────────────────────

export async function getRecoveryLog(date: string): Promise<RecoveryLog | null> {
  const result = await db
    .select()
    .from(recoveryLogs)
    .where(eq(recoveryLogs.date, date));
  return result[0] ?? null;
}

export async function upsertRecoveryLog(log: NewRecoveryLog): Promise<void> {
  await inTx(async () => {
    const record = { ...log, updated_at: nowIso() };
    await db
      .insert(recoveryLogs)
      .values(record)
      .onConflictDoUpdate({
        target: recoveryLogs.date,
        set: record,
      });
  });
}

export async function getRecentRecoveryLogs(days: number = 7): Promise<RecoveryLog[]> {
  const cutoffStr = addDays(localDateString(), -days);

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
    .where(and(eq(supplementLogs.date, date), isNull(supplementLogs.deleted_at)));
}

export async function upsertSupplementLog(
  date: string,
  supplementName: string,
  taken: boolean
): Promise<void> {
  await inTx(async () => {
    const existing = await db
      .select()
      .from(supplementLogs)
      .where(eq(supplementLogs.date, date));
    const existingForSupplement = existing.find(
      (s) => s.supplement_name === supplementName,
    );
    const now = nowUnix();
    const updatedAt = nowIso();

    if (existingForSupplement) {
      await db
        .update(supplementLogs)
        .set({ taken: taken ? 1 : 0, logged_at: now, updated_at: updatedAt, deleted_at: null })
        .where(eq(supplementLogs.id, existingForSupplement.id));
    } else {
      const { default: uuid } = await import("react-native-uuid");
      await db.insert(supplementLogs).values({
        id: uuid.v4() as string,
        date,
        supplement_name: supplementName,
        taken: taken ? 1 : 0,
        logged_at: now,
        updated_at: updatedAt,
        deleted_at: null,
      });
    }
  });
}

export async function getSupplementAdherence30d(): Promise<Record<string, number>> {
  const cutoffStr = addDays(localDateString(), -29);

  const logs = await db
    .select()
    .from(supplementLogs)
    .where(and(gte(supplementLogs.date, cutoffStr), isNull(supplementLogs.deleted_at)));

  const adherence = new Map<string, { taken: number; total: number }>();
  for (const log of logs) {
    const counts = adherence.get(log.supplement_name) ?? { taken: 0, total: 0 };
    counts.total++;
    if (log.taken) counts.taken++;
    adherence.set(log.supplement_name, counts);
  }

  const result: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [name, data] of adherence) {
    result[name] = data.total > 0 ? (data.taken / data.total) * 100 : 0;
  }

  return result;
}
