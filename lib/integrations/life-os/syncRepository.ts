import { Platform } from "react-native";
import { sqlite } from "../../db/client";
import {
  mapBodyStat,
  mapDailyNutrition,
  mapPersonalRecord,
  mapRecoveryLog,
  mapTombstone,
  mapWorkoutSession,
} from "./recordMappers";
import { type SyncRecord } from "./exportSchema";
import { type SyncQueueEntry, type SyncQueueState } from "./syncQueue";

const SOURCE_APP = "nutrilift";

function requireNativeSqlite() {
  if (Platform.OS === "web" || !sqlite) {
    throw new Error("NutriLift sync requires the native SQLite database.");
  }
  return sqlite;
}

export async function getSyncCursor(): Promise<string | null> {
  const database = requireNativeSqlite();
  const result = await database.getFirstAsync(
    "SELECT cursor FROM sync_state WHERE source_app = ?",
    [SOURCE_APP]
  );
  return result?.cursor ?? null;
}

export async function saveSyncState(values: { cursor?: string; error?: string | null; success?: boolean }): Promise<void> {
  const database = requireNativeSqlite();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO sync_state (source_app, cursor, last_synced_at, last_success_at, last_error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_app) DO UPDATE SET
       cursor = COALESCE(excluded.cursor, sync_state.cursor),
       last_synced_at = excluded.last_synced_at,
       last_success_at = COALESCE(excluded.last_success_at, sync_state.last_success_at),
       last_error = excluded.last_error,
       updated_at = excluded.updated_at`,
    [SOURCE_APP, values.cursor ?? null, now, values.success ? now : null, values.error ?? null, now]
  );
}

export async function getChangedRecords(cursor: string | null): Promise<SyncRecord[]> {
  const database = requireNativeSqlite();
  const since = cursor ?? "1970-01-01T00:00:00.000Z";
  const query = async (table: string) => database.getAllAsync(`SELECT * FROM ${table} WHERE updated_at > ?`, [since]);

  const [nutrition, workouts, records, bodyStats, recoveryLogs, tombstones] = await Promise.all([
    query("daily_nutrition"),
    query("workout_sessions"),
    query("personal_records"),
    query("body_stats"),
    query("recovery_logs"),
    database.getAllAsync("SELECT * FROM sync_tombstones WHERE deleted_at > ?", [since]),
  ]);

  return [
    ...nutrition.map(mapDailyNutrition),
    ...workouts.map(mapWorkoutSession),
    ...records.map(mapPersonalRecord),
    ...bodyStats.map(mapBodyStat),
    ...recoveryLogs.flatMap(mapRecoveryLog),
    ...tombstones.flatMap((row: { entity_type: string; entity_id: string; external_id?: string | null; deleted_at: string }) => {
      const record = mapTombstone(row.entity_type, row.entity_id, row.deleted_at, row.external_id);
      return record ? [record] : [];
    }),
  ];
}

export async function enqueueRecords(records: SyncRecord[]): Promise<void> {
  const database = requireNativeSqlite();
  const now = new Date().toISOString();
  for (const record of records) {
    await database.runAsync(
      `INSERT INTO sync_queue (id, external_id, payload_json, state, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)
       ON CONFLICT(external_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         state = 'pending',
         last_error = NULL,
         next_retry_at = NULL,
         updated_at = excluded.updated_at`,
      [`sync:${record.externalId}`, record.externalId, JSON.stringify(record), now, now]
    );
  }
}

export async function getQueuedRecords(batchSize = 100): Promise<SyncRecord[]> {
  const database = requireNativeSqlite();
  const now = new Date().toISOString();
  const rows = await database.getAllAsync(
    `SELECT payload_json FROM sync_queue
     WHERE state IN ('pending', 'failed') AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY updated_at ASC LIMIT ?`,
    [now, batchSize]
  );
  return rows.map((row: { payload_json: string }) => JSON.parse(row.payload_json) as SyncRecord);
}

export async function setQueueState(externalIds: string[], state: SyncQueueState, error?: string): Promise<void> {
  if (externalIds.length === 0) return;
  const database = requireNativeSqlite();
  const now = new Date().toISOString();
  const retryAt = state === "failed" ? new Date(Date.now() + 60_000).toISOString() : null;
  const placeholders = externalIds.map(() => "?").join(", ");
  await database.runAsync(
    `UPDATE sync_queue SET state = ?, updated_at = ?, last_error = ?,
       attempt_count = CASE WHEN ? = 'failed' THEN attempt_count + 1 ELSE attempt_count END,
       next_retry_at = ? WHERE external_id IN (${placeholders})`,
    [state, now, error ?? null, state, retryAt, ...externalIds]
  );
}

export async function recordTombstone(entityType: string, entityId: string, externalId?: string): Promise<void> {
  const database = requireNativeSqlite();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO sync_tombstones (id, entity_type, entity_id, external_id, deleted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       external_id = COALESCE(excluded.external_id, sync_tombstones.external_id),
       deleted_at = excluded.deleted_at`,
    [`tombstone:${entityType}:${entityId}`, entityType, entityId, externalId ?? null, now, now]
  );
}

export function newestSourceTimestamp(records: SyncRecord[]): string | null {
  return records.reduce<string | null>((newest, record) => {
    const timestamp = record.sourceUpdatedAt ?? record.occurredAt;
    return !newest || timestamp > newest ? timestamp : newest;
  }, null);
}
