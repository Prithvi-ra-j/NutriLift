import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "../client";
import { bodyStats, type BodyStat, type NewBodyStat } from "../schema";
import { recordTombstone } from "../../integrations/life-os/syncRepository";
import { addCalendarDays, toLocalDateKey } from "../../utils/local-date";

export async function insertBodyStat(stat: NewBodyStat): Promise<void> {
  await db.insert(bodyStats).values({ ...stat, updated_at: new Date().toISOString() });
}

export async function getLatestWeight(): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(eq(bodyStats.type, "weight"))
    .orderBy(desc(bodyStats.date))
    .limit(1);
  return result[0] ?? null;
}

export async function getLatestInBody(): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(eq(bodyStats.type, "inbody"))
    .orderBy(desc(bodyStats.date))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllInBodyRecords(): Promise<BodyStat[]> {
  return db
    .select()
    .from(bodyStats)
    .where(eq(bodyStats.type, "inbody"))
    .orderBy(bodyStats.date);
}

export async function getWeightHistory(days: number = 30): Promise<BodyStat[]> {
  const cutoffStr = addCalendarDays(toLocalDateKey(), -days);

  return db
    .select()
    .from(bodyStats)
    .where(and(eq(bodyStats.type, "weight"), gte(bodyStats.date, cutoffStr)))
    .orderBy(bodyStats.date);
}

export async function getBodyStatsForDateRange(
  startDate: string,
  endDate: string
): Promise<BodyStat[]> {
  return db
    .select()
    .from(bodyStats)
    .where(
      and(
        gte(bodyStats.date, startDate),
        lte(bodyStats.date, endDate)
      )
    )
    .orderBy(bodyStats.date);
}

export async function getBodyStatForDate(date: string): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(and(eq(bodyStats.date, date), eq(bodyStats.type, "weight")));
  return result[0] ?? null;
}

export async function deleteBodyStat(id: string): Promise<void> {
  await db.delete(bodyStats).where(eq(bodyStats.id, id));
  await recordTombstone("body_stat", id);
}

// ─── 7-day rolling average ────────────────────────────────────────────────────
export function computeRollingAverage(
  weights: { date: string; weight_kg: number | null }[],
  windowDays: number = 7
): { date: string; avg: number | null }[] {
  if (!Number.isInteger(windowDays) || windowDays < 1) return [];
  const valid = weights
    .filter((entry) => entry.weight_kg !== null && Number.isFinite(entry.weight_kg) && entry.weight_kg > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  // Use actual calendar-day windows, not the last N observations. Return null-like
  // absence explicitly as null; never fake zero.
  return weights.slice().sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
    const cutoff = addCalendarDays(entry.date, -(windowDays - 1));
    const window = valid.filter((measurement) => measurement.date >= cutoff && measurement.date <= entry.date);
    if (window.length === 0) return { date: entry.date, avg: null };
    const avg = window.reduce((sum, item) => sum + (item.weight_kg as number), 0) / window.length;
    return { date: entry.date, avg: Math.round(avg * 100) / 100 };
  });
}
