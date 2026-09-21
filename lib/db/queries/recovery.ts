// @ts-nocheck
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { getDateDaysAgo } from "../../dates";
import { db } from "../client";
import { recoveryLogs, supplementLogs, type RecoveryLog, type NewRecoveryLog, type SupplementLog } from "../schema";

// ─── Recovery Queries ─────────────────────────────────────────────────────────

export async function getRecoveryLog(date: string): Promise<RecoveryLog | null> {
  const result = await db
    .select()
    .from(recoveryLogs)
    .where(eq(recoveryLogs.date, date));
  return result[0] ?? null;
}

export async function upsertRecoveryLog(log: NewRecoveryLog): Promise<void> {
  const record = { ...log, updated_at: new Date().toISOString() };
  const existing = await getRecoveryLog(log.date);
  if (existing) {
    await db.update(recoveryLogs).set(record).where(eq(recoveryLogs.date, log.date));
  } else {
    await db.insert(recoveryLogs).values(record);
  }
}

export async function getRecentRecoveryLogs(days: number = 7): Promise<RecoveryLog[]> {
  const cutoffStr = getDateDaysAgo(Math.max(0, days - 1));

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
    .where(eq(supplementLogs.date, date));
}

export async function upsertSupplementLog(
  date: string,
  supplementName: string,
  taken: boolean
): Promise<void> {
  const existing = await db
    .select()
    .from(supplementLogs)
    .where(
      eq(supplementLogs.date, date)
    );

  const existingForSupplement = existing.find(
    (s) => s.supplement_name === supplementName
  );

  const now = Math.floor(Date.now() / 1000);

  if (existingForSupplement) {
    await db
      .update(supplementLogs)
      .set({ taken: taken ? 1 : 0, logged_at: now })
      .where(eq(supplementLogs.id, existingForSupplement.id));
  } else {
    const { default: uuid } = await import("react-native-uuid");
    await db.insert(supplementLogs).values({
      id: uuid.v4() as string,
      date,
      supplement_name: supplementName,
      taken: taken ? 1 : 0,
      logged_at: now,
    });
  }
}

export async function getSupplementAdherence30d(): Promise<Record<string, number>> {
  const cutoffStr = getDateDaysAgo(29);
  const logs = await db.select().from(supplementLogs).where(gte(supplementLogs.date, cutoffStr));
  const result: Record<string, number> = {};
  const bySupplement = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!bySupplement.has(log.supplement_name)) bySupplement.set(log.supplement_name, new Set());
    if (log.taken) bySupplement.get(log.supplement_name)!.add(log.date);
  }
  for (const [name, dates] of bySupplement) result[name] = (dates.size / 30) * 100;
  return result;
}
