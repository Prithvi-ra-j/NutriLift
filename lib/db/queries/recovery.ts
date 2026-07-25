import { eq, gte, lte, and, desc } from "drizzle-orm";
import { db } from "../client";
import { recoveryLogs, supplementLogs, type RecoveryLog, type NewRecoveryLog, type SupplementLog } from "../schema";
import { USER_PROFILE } from "../../constants/user-profile";

// ─── Recovery Queries ─────────────────────────────────────────────────────────

export async function getRecoveryLog(date: string): Promise<RecoveryLog | null> {
  const result = await db
    .select()
    .from(recoveryLogs)
    .where(eq(recoveryLogs.date, date));
  return result[0] ?? null;
}

export async function upsertRecoveryLog(log: NewRecoveryLog): Promise<void> {
  const existing = await getRecoveryLog(log.date);
  if (existing) {
    await db.update(recoveryLogs).set(log).where(eq(recoveryLogs.date, log.date));
  } else {
    await db.insert(recoveryLogs).values(log);
  }
}

export async function getRecentRecoveryLogs(days: number = 7): Promise<RecoveryLog[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

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
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  const cutoffStr = cutoff.toISOString().split("T")[0];

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
