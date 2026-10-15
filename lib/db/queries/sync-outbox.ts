import { and, eq } from "drizzle-orm";
import { syncQueue, syncTombstones, type BodyStat, type DailyNutrition, type WorkoutSession, type RecoveryLog } from "../schema";
import { mapBodyStat, mapDailyNutrition, mapRecoveryLog, mapTombstone, mapWorkoutSession } from "../../integrations/life-os/recordMappers";
import type { SyncRecord } from "../../integrations/life-os/exportSchema";

/** Durable local outbox write; callers pass their active domain transaction. */
export async function enqueueSyncRecord(tx: any, record: SyncRecord): Promise<void> {
  const now = new Date().toISOString();
  const payload = JSON.stringify(record);
  await tx.insert(syncQueue).values({
    id: `outbox:${record.externalId}`,
    external_id: record.externalId,
    payload_json: payload,
    state: "pending",
    attempt_count: 0,
    last_error: null,
    next_retry_at: null,
    created_at: now,
    updated_at: now,
  }).onConflictDoUpdate({
    target: syncQueue.external_id,
    set: { payload_json: payload, state: "pending", attempt_count: 0, last_error: null, next_retry_at: null, updated_at: now },
  });
}

export async function enqueueBodyStat(tx: any, row: BodyStat): Promise<void> {
  await tx.delete(syncTombstones).where(and(
    eq(syncTombstones.entity_type, "body_stat"),
    eq(syncTombstones.entity_id, row.id),
  ));
  await enqueueSyncRecord(tx, mapBodyStat(row as any));
}

export async function enqueueDailyNutrition(tx: any, row: DailyNutrition): Promise<void> {
  // A live row supersedes an older tombstone for the same stable external ID.
  await tx.delete(syncTombstones).where(and(
    eq(syncTombstones.entity_type, "daily_nutrition"),
    eq(syncTombstones.entity_id, row.date),
  ));
  await enqueueSyncRecord(tx, mapDailyNutrition(row as unknown as Parameters<typeof mapDailyNutrition>[0]));
}

export async function enqueueWorkoutSession(tx: any, row: WorkoutSession): Promise<void> {
  await tx.delete(syncTombstones).where(and(
    eq(syncTombstones.entity_type, "workout_session"),
    eq(syncTombstones.entity_id, row.id),
  ));
  await enqueueSyncRecord(tx, mapWorkoutSession(row as any));
}

export async function enqueueRecoveryLog(tx: any, row: RecoveryLog): Promise<void> {
  for (const record of mapRecoveryLog(row as any)) {
    await enqueueSyncRecord(tx, record);
  }
}

/** Persist a tombstone and its outbound record in the same domain transaction. */
export async function enqueueTombstone(
  tx: any,
  entityType: string,
  entityId: string,
  deletedAt: string,
  externalId?: string,
): Promise<void> {
  const record = mapTombstone(entityType, entityId, deletedAt, externalId);
  if (!record) return;
  await tx.insert(syncTombstones).values({
    id: `tombstone:${entityType}:${entityId}`,
    entity_type: entityType,
    entity_id: entityId,
    external_id: record.externalId,
    deleted_at: deletedAt,
    created_at: deletedAt,
  }).onConflictDoUpdate({
    target: [syncTombstones.entity_type, syncTombstones.entity_id],
    set: { external_id: record.externalId, deleted_at: deletedAt },
  });
  await enqueueSyncRecord(tx, record);
}
