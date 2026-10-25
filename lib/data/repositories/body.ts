import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "../db/client";
import { bodyStats, type BodyStat, type NewBodyStat } from "../db/schema";
import { inTx } from "../db/tx";
import { alive } from "../db/alive";
import { nowIso } from "../../time/clock";
import { addDays, localDateString } from "../../time/localDate";

export async function insertBodyStat(stat: NewBodyStat): Promise<void> {
  await inTx(async () => {
    await db.insert(bodyStats).values({
      ...stat,
      updated_at: nowIso(),
      deleted_at: null,
    });
  });
}

export async function getLatestWeight(): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(and(eq(bodyStats.type, "weight"), alive(bodyStats)))
    .orderBy(desc(bodyStats.date))
    .limit(1);
  return result[0] ?? null;
}

export async function getLatestInBody(): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(and(eq(bodyStats.type, "inbody"), alive(bodyStats)))
    .orderBy(desc(bodyStats.date))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllInBodyRecords(): Promise<BodyStat[]> {
  return db
    .select()
    .from(bodyStats)
    .where(and(eq(bodyStats.type, "inbody"), alive(bodyStats)))
    .orderBy(bodyStats.date);
}

export async function getWeightHistory(days: number = 30): Promise<BodyStat[]> {
  const cutoffStr = addDays(localDateString(), -days);

  return db
    .select()
    .from(bodyStats)
    .where(and(
      eq(bodyStats.type, "weight"),
      gte(bodyStats.date, cutoffStr),
      alive(bodyStats),
    ))
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
        lte(bodyStats.date, endDate),
        alive(bodyStats),
      )
    )
    .orderBy(bodyStats.date);
}

export async function getBodyStatForDate(date: string): Promise<BodyStat | null> {
  const result = await db
    .select()
    .from(bodyStats)
    .where(and(
      eq(bodyStats.date, date),
      eq(bodyStats.type, "weight"),
      alive(bodyStats),
    ));
  return result[0] ?? null;
}

export async function deleteBodyStat(id: string): Promise<void> {
  await inTx(async () => {
    const [existing] = await db
      .select({ id: bodyStats.id })
      .from(bodyStats)
      .where(and(eq(bodyStats.id, id), alive(bodyStats)))
      .limit(1);
    if (!existing) return;

    const deletedAt = nowIso();
    await db
      .update(bodyStats)
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where(and(eq(bodyStats.id, id), alive(bodyStats)));
  });
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
