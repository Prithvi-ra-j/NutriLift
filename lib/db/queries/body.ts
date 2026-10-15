import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "../client";
import { bodyStats, syncTombstones, type BodyStat, type NewBodyStat } from "../schema";
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
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("Weight history days must be an integer from 1 to 365.");
  }
  const cutoffStr = addCalendarDays(toLocalDateKey(), -(days - 1));

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
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(bodyStats).where(eq(bodyStats.id, id)).limit(1);
    if (!rows[0]) return;
    const now = new Date().toISOString();
    const externalId = `nutrilift:body_stat:${id}`;
    await tx.delete(bodyStats).where(eq(bodyStats.id, id));
    await tx.insert(syncTombstones).values({
      id: `tombstone:body_stat:${id}`,
      entity_type: "body_stat",
      entity_id: id,
      external_id: externalId,
      deleted_at: now,
      created_at: now,
    }).onConflictDoUpdate({
      target: [syncTombstones.entity_type, syncTombstones.entity_id],
      set: { external_id: externalId, deleted_at: now },
    });
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
