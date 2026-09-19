import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "../client";
import { bodyStats, type BodyStat, type NewBodyStat } from "../schema";
import { recordTombstone } from "../../integrations/life-os/syncRepository";

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
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

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
): { date: string; avg: number }[] {
  return weights.map((entry, index) => {
    const start = Math.max(0, index - windowDays + 1);
    const window = weights.slice(start, index + 1);
    const validWeights = window
      .map((w) => w.weight_kg)
      .filter((w): w is number => w !== null);
    const avg =
      validWeights.length > 0
        ? validWeights.reduce((a, b) => a + b, 0) / validWeights.length
        : 0;
    return { date: entry.date, avg };
  });
}
