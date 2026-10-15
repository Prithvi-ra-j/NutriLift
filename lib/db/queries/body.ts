import { eq, and, desc, lte, gte } from "drizzle-orm";
import { db } from "../client";
import { bodyStats, type BodyStat, type NewBodyStat } from "../schema";
import { enqueueBodyStat, enqueueTombstone } from "./sync-outbox";
import { addCalendarDays, toLocalDateKey } from "../../utils/local-date";
import { appendDomainEvent } from "./domain-events";

export async function insertBodyStat(stat: NewBodyStat): Promise<void> {
  await db.transaction(async (tx: any) => {
    const record = { ...stat, updated_at: new Date().toISOString() };
    await tx.insert(bodyStats).values(record);
    const rows = await tx.select().from(bodyStats).where(eq(bodyStats.id, stat.id)).limit(1);
    if (rows[0]) await enqueueBodyStat(tx, rows[0]);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `body-stat:${stat.id}:saved`, eventType: "body.measurement.saved", entityType: "body_stat", entityId: stat.id, entityVersion: eventVersion, occurredAt: record.updated_at, metadata: { date: stat.date, measurementType: stat.type } });
  });
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
    await enqueueTombstone(tx, "body_stat", id, now, `nutrilift:body_stat:${id}`);
    await tx.delete(bodyStats).where(eq(bodyStats.id, id));
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `body-stat:${id}:deleted:${eventVersion}`, eventType: "body.measurement.deleted", entityType: "body_stat", entityId: id, entityVersion: eventVersion, occurredAt: now, metadata: { date: rows[0].date, measurementType: rows[0].type } });
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
