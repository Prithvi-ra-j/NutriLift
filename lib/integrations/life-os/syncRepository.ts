import { Platform } from "react-native";
import { sqlite } from "../../db/client";
import {
  mapBodyStat,
  mapDailyNutrition,
  mapExerciseLog,
  mapFoodLog,
  mapPersonalRecord,
  mapRecoveryLog,
  mapSetLog,
  mapSupplementLog,
  mapTombstone,
  mapWorkoutSession,
  type SyncableRow,
} from "./recordMappers";
import { type SyncRecord } from "./exportSchema";
import { inTx } from "../../db/tx";
import { nowIso, nowUnix } from "../../time/clock";
import { validateRecord } from "../../sync/schemas";

const SOURCE_APP = "nutrilift";
const CLAIM_LEASE_MS = 2 * 60 * 1000;
const PAGE_SIZE = 200;

export type SyncQueueRow = {
  id: string;
  external_id: string;
  payload_json: string;
  attempt_count: number;
};

function requireNativeSqlite() {
  if (Platform.OS === "web" || !sqlite) {
    throw new Error("NutriLift sync requires the native SQLite database.");
  }
  return sqlite;
}

export type SyncTable = {
  name: string;
  idColumn: string;
  map: (row: SyncableRow) => SyncRecord | SyncRecord[];
};

const syncedTables: SyncTable[] = [
  { name: "food_logs", idColumn: "id", map: mapFoodLog },
  { name: "supplement_logs", idColumn: "id", map: mapSupplementLog },
  { name: "workout_sessions", idColumn: "id", map: mapWorkoutSession },
  { name: "exercise_logs", idColumn: "id", map: mapExerciseLog },
  { name: "set_logs", idColumn: "id", map: mapSetLog },
  { name: "personal_records", idColumn: "exercise_name", map: mapPersonalRecord },
  { name: "body_stats", idColumn: "id", map: mapBodyStat },
  { name: "daily_nutrition", idColumn: "date", map: mapDailyNutrition },
  { name: "recovery_logs", idColumn: "date", map: mapRecoveryLog },
];

export type SyncQueueState = "pending" | "uploading" | "uploaded" | "failed" | "rejected" | "dead";

export type SyncQueueCounts = Record<SyncQueueState, number>;

export type QueueDatabase = {
  runAsync: (source: string, params: (string | number | null)[]) => Promise<unknown>;
  getAllAsync: <T>(source: string, params: (string | number | null)[]) => Promise<T[]>;
};

export async function saveSyncState(values: { error?: string | null; success?: boolean }): Promise<void> {
  const database = requireNativeSqlite();
  await inTx(async () => {
    const now = nowIso();
    await database.runAsync(
      `INSERT INTO sync_state (source_app, cursor, last_synced_at, last_success_at, last_error, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?)
       ON CONFLICT(source_app) DO UPDATE SET
         last_synced_at = excluded.last_synced_at,
         last_success_at = COALESCE(excluded.last_success_at, sync_state.last_success_at),
         last_error = excluded.last_error,
         updated_at = excluded.updated_at`,
      [SOURCE_APP, now, values.success ? now : null, values.error ?? null, now],
    );
  }, false);
}

export async function getSyncMetadata(): Promise<{ lastSuccessAt: string | null; lastError: string | null }> {
  const database = requireNativeSqlite();
  const row = await database.getFirstAsync<{ last_success_at: string | null; last_error: string | null }>(
    "SELECT last_success_at, last_error FROM sync_state WHERE source_app = ?",
    [SOURCE_APP],
  );
  return { lastSuccessAt: row?.last_success_at ?? null, lastError: row?.last_error ?? null };
}

function rowId(row: SyncableRow, idColumn: string): string {
  const id = row[idColumn];
  if (id === null || id === undefined || String(id).length === 0) {
    throw new Error(`missing_${idColumn}`);
  }
  return String(id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function persistRecord(
  database: QueueDatabase,
  record: SyncRecord,
  now: string,
): Promise<boolean> {
  const validation = validateRecord(record);
  const state = validation.success ? "pending" : "rejected";
  const error = validation.success ? null : validation.error;
  if (validation.success && !record.deleted) {
    await database.runAsync(
      "DELETE FROM sync_uploaded_deletions WHERE external_id = ?",
      [record.externalId],
    );
  }
  await database.runAsync(
    `INSERT INTO sync_queue (
       id, external_id, payload_json, state, attempt_count, last_error,
       next_retry_at, next_attempt_at, lease_until, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 0, ?, NULL, NULL, NULL, ?, ?)
     ON CONFLICT(external_id) DO UPDATE SET
       payload_json = excluded.payload_json,
       state = excluded.state,
       attempt_count = 0,
       last_error = excluded.last_error,
       next_retry_at = NULL,
       next_attempt_at = NULL,
       lease_until = NULL,
       updated_at = excluded.updated_at`,
    [
      `sync:${record.externalId}`,
      record.externalId,
      JSON.stringify(record),
      state,
      error,
      now,
      now,
    ],
  );
  return validation.success;
}

async function persistPage(
  table: SyncTable,
  rows: SyncableRow[],
): Promise<{ queued: number; rejected: number }> {
  const database = requireNativeSqlite();
  return inTx(() => persistPageToDatabase(database, table, rows), false);
}

export async function persistPageToDatabase(
  database: QueueDatabase,
  table: SyncTable,
  rows: SyncableRow[],
  now = nowIso(),
): Promise<{ queued: number; rejected: number }> {
  let queued = 0;
  let rejected = 0;

  for (const row of rows) {
    const id = rowId(row, table.idColumn);
    let records: SyncRecord[];
    let mappingError: string | null = null;
    try {
      const mapped = table.map(row);
      records = Array.isArray(mapped) ? mapped : [mapped];
    } catch (error) {
      records = [];
      mappingError = error instanceof Error ? error.message : String(error);
    }
    if (mappingError) {
      const externalId = `nutrilift:rejected:${table.name}:${id}`;
      await database.runAsync(
        `INSERT INTO sync_queue (
           id, external_id, payload_json, state, attempt_count, last_error,
           next_retry_at, next_attempt_at, lease_until, created_at, updated_at
         ) VALUES (?, ?, ?, 'rejected', 0, ?, NULL, NULL, NULL, ?, ?)
         ON CONFLICT(external_id) DO UPDATE SET payload_json = excluded.payload_json,
           state = 'rejected', last_error = excluded.last_error, updated_at = excluded.updated_at`,
        [
          `sync:${externalId}`,
          externalId,
          JSON.stringify({ sourceTable: table.name, rowId: id, row }),
          mappingError,
          now,
          now,
        ],
      );
      rejected += 1;
      continue;
    }
    await database.runAsync(
      "DELETE FROM sync_queue WHERE external_id = ? AND state = 'rejected'",
      [`nutrilift:rejected:${table.name}:${id}`],
    );
    for (const record of records) {
      if (await persistRecord(database, record, now)) queued += 1;
      else rejected += 1;
    }
  }

  const last = rows.at(-1);
  if (last) {
    await database.runAsync(
      `INSERT INTO sync_checkpoint (source_table, last_updated_at, last_id)
       VALUES (?, COALESCE(?, ''), ?)
       ON CONFLICT(source_table) DO UPDATE SET
         last_updated_at = excluded.last_updated_at,
         last_id = excluded.last_id`,
      [table.name, last.updated_at ?? "", rowId(last, table.idColumn)],
    );
  }
  return { queued, rejected };
}

export async function enqueueChangedRecords(): Promise<{ queued: number; rejected: number }> {
  const database = requireNativeSqlite();
  let queued = 0;
  let rejected = 0;

  for (const table of syncedTables) {
    let hasMore = true;
    while (hasMore) {
      const checkpoint = await database.getFirstAsync<{
        last_updated_at: string;
        last_id: string;
      }>("SELECT last_updated_at, last_id FROM sync_checkpoint WHERE source_table = ?", [table.name]);
      const updatedAt = checkpoint?.last_updated_at ?? "";
      const lastId = checkpoint?.last_id ?? "";
      const rows = await database.getAllAsync<SyncableRow>(
        `SELECT * FROM ${table.name}
         WHERE COALESCE(updated_at, '') > ?
            OR (COALESCE(updated_at, '') = ? AND CAST(${table.idColumn} AS TEXT) > ?)
         ORDER BY COALESCE(updated_at, ''), CAST(${table.idColumn} AS TEXT)
         LIMIT ?`,
        [updatedAt, updatedAt, lastId, PAGE_SIZE],
      );
      if (rows.length === 0) {
        hasMore = false;
        continue;
      }
      const result = await persistPage(table, rows);
      queued += result.queued;
      rejected += result.rejected;
      hasMore = rows.length === PAGE_SIZE;
    }
  }

  return { queued, rejected };
}

export async function enqueueLegacyTombstones(): Promise<{ queued: number; rejected: number }> {
  const database = requireNativeSqlite();
  const rows = await database.getAllAsync<{
    entity_type: string;
    entity_id: string;
    external_id: string | null;
    deleted_at: string;
  }>(
    `SELECT t.entity_type, t.entity_id, t.external_id, t.deleted_at
     FROM sync_tombstones t
     WHERE NOT EXISTS (
       SELECT 1 FROM sync_queue q WHERE q.external_id = COALESCE(
         t.external_id, 'nutrilift:' || t.entity_type || ':' || t.entity_id
       ) AND q.state IN ('pending', 'uploading', 'uploaded', 'failed', 'rejected', 'dead')
     )
     ORDER BY t.deleted_at, t.id`,
  );
  let queued = 0;
  let rejected = 0;
  for (const row of rows) {
    const record = mapTombstone(row.entity_type, row.entity_id, row.deleted_at, row.external_id);
    if (!record) continue;
    const validation = validateRecord(record);
    const now = nowIso();
    await database.runAsync(
      `INSERT INTO sync_queue (
         id, external_id, payload_json, state, attempt_count, last_error,
         next_retry_at, next_attempt_at, lease_until, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 0, ?, NULL, NULL, NULL, ?, ?)
       ON CONFLICT(external_id) DO NOTHING`,
      [
        `sync:${record.externalId}`,
        record.externalId,
        JSON.stringify(record),
        validation.success ? "pending" : "rejected",
        validation.success ? null : validation.error,
        now,
        now,
      ],
    );
    if (validation.success) queued += 1;
    else rejected += 1;
  }
  return { queued, rejected };
}

export async function claimQueueRows(
  database: QueueDatabase,
  batchSize: number,
  now: string,
  leaseMs = CLAIM_LEASE_MS,
): Promise<SyncQueueRow[]> {
  const leaseUntil = new Date(Date.parse(now) + leaseMs).toISOString();
  await database.runAsync(
    `UPDATE sync_queue
     SET state = 'pending', lease_until = NULL, updated_at = ?
     WHERE state = 'uploading' AND lease_until IS NOT NULL AND lease_until < ?`,
    [now, now],
  );
  await database.runAsync(
    `UPDATE sync_queue SET state = 'dead', lease_until = NULL, updated_at = ?
     WHERE state IN ('pending', 'failed') AND attempt_count >= 8`,
    [now],
  );
  return database.getAllAsync<SyncQueueRow>(
    `UPDATE sync_queue
     SET state = 'uploading', lease_until = ?, attempt_count = attempt_count + 1, updated_at = ?
     WHERE id IN (
       SELECT id FROM sync_queue
       WHERE state = 'pending'
          OR (state = 'failed' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       ORDER BY created_at, id LIMIT ?
     )
     RETURNING id, external_id, payload_json, attempt_count`,
    [leaseUntil, now, now, Math.max(1, Math.min(200, batchSize))],
  );
}

export async function claimQueueBatch(batchSize = 100): Promise<SyncQueueRow[]> {
  const database = requireNativeSqlite();
  return inTx(
    () => claimQueueRows(database, batchSize, nowIso()),
    false,
  );
}

export async function finishQueueBatch(
  rows: SyncQueueRow[],
  outcome: { success: true } | { success: false; error: string },
): Promise<void> {
  if (rows.length === 0) return;
  const database = requireNativeSqlite();
  await inTx(() => finishQueueRows(database, rows, outcome, nowIso()), false);
}

export async function finishQueueRows(
  database: QueueDatabase,
  rows: SyncQueueRow[],
  outcome: { success: true } | { success: false; error: string },
  now: string,
): Promise<void> {
  for (const row of rows) {
    const dead = !outcome.success && row.attempt_count >= 8;
    const nextAttemptAt = !outcome.success && !dead
      ? new Date(Date.parse(now) + Math.min(30_000 * (2 ** row.attempt_count), 6 * 60 * 60 * 1000)).toISOString()
      : null;
    if (outcome.success) {
      const record = JSON.parse(row.payload_json) as SyncRecord;
      if (record.deleted) {
        await database.runAsync(
          `INSERT INTO sync_uploaded_deletions (external_id, uploaded_at)
           VALUES (?, ?)
           ON CONFLICT(external_id) DO UPDATE SET uploaded_at = excluded.uploaded_at`,
          [row.external_id, now],
        );
      }
    }
    await database.runAsync(
      `UPDATE sync_queue
       SET state = ?, lease_until = NULL, last_error = ?, next_attempt_at = ?,
           next_retry_at = ?, updated_at = ?
       WHERE id = ? AND state = 'uploading'`,
      [
        outcome.success ? "uploaded" : dead ? "dead" : "failed",
        outcome.success ? null : outcome.error,
        nextAttemptAt,
        nextAttemptAt,
        now,
        row.id,
      ],
    );
  }
}

export async function retryRejectedRecords(): Promise<number> {
  const database = requireNativeSqlite();
  return inTx(async () => {
    const now = nowIso();
    let retried = 0;
    const rows = await database.getAllAsync<{
      id: string;
      external_id: string;
      payload_json: string;
      state: "rejected" | "dead";
    }>(
      "SELECT id, external_id, payload_json, state FROM sync_queue WHERE state IN ('rejected', 'dead')",
    );
    for (const row of rows) {
      if (row.state === "dead") {
        await database.runAsync(
          `UPDATE sync_queue SET state = 'pending', attempt_count = 0, last_error = NULL,
             next_attempt_at = NULL, next_retry_at = NULL, lease_until = NULL, updated_at = ?
           WHERE id = ? AND state = 'dead'`,
          [now, row.id],
        );
        retried += 1;
        continue;
      }

      const payload: unknown = JSON.parse(row.payload_json);
      if (!row.external_id.startsWith("nutrilift:rejected:")) {
        if (validateRecord(payload).success) {
          await database.runAsync(
            `UPDATE sync_queue SET state = 'pending', attempt_count = 0, last_error = NULL,
               next_attempt_at = NULL, next_retry_at = NULL, lease_until = NULL, updated_at = ?
             WHERE id = ? AND state = 'rejected'`,
            [now, row.id],
          );
          retried += 1;
        }
        continue;
      }

      if (
        !isRecord(payload) ||
        typeof payload.sourceTable !== "string" ||
        typeof payload.rowId !== "string" ||
        !isRecord(payload.row)
      ) {
        throw new Error(`Rejected sync item ${row.external_id} has an invalid retry payload.`);
      }
      const table = syncedTables.find((candidate) => candidate.name === payload.sourceTable);
      if (!table) throw new Error(`Rejected sync item references unknown table ${payload.sourceTable}.`);
      const sourceRow = await database.getFirstAsync<SyncableRow>(
        `SELECT * FROM ${table.name} WHERE CAST(${table.idColumn} AS TEXT) = ?`,
        [payload.rowId],
      );
      if (!sourceRow) {
        await database.runAsync("DELETE FROM sync_queue WHERE id = ?", [row.id]);
        continue;
      }
      let mapped: SyncRecord | SyncRecord[];
      try {
        mapped = table.map(sourceRow);
      } catch (error) {
        await database.runAsync(
          "UPDATE sync_queue SET last_error = ?, updated_at = ? WHERE id = ?",
          [error instanceof Error ? error.message : String(error), now, row.id],
        );
        continue;
      }
      const records = Array.isArray(mapped) ? mapped : [mapped];
      for (const record of records) {
        if (await persistRecord(database, record, now)) retried += 1;
      }
      await database.runAsync("DELETE FROM sync_queue WHERE id = ?", [row.id]);
    }
    return retried;
  }, false);
}

export async function getQueueCounts(): Promise<SyncQueueCounts> {
  const database = requireNativeSqlite();
  const rows = await database.getAllAsync<{ state: SyncQueueState; count: number }>(
    "SELECT state, COUNT(*) AS count FROM sync_queue GROUP BY state",
  );
  const counts: SyncQueueCounts = {
    pending: 0,
    uploading: 0,
    uploaded: 0,
    failed: 0,
    rejected: 0,
    dead: 0,
  };
  for (const row of rows) counts[row.state] = row.count;
  return counts;
}

export async function purgeUploadedQueue(): Promise<number> {
  const database = requireNativeSqlite();
  const cutoff = new Date(nowUnix() * 1000 - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await database.runAsync(
    "DELETE FROM sync_queue WHERE state = 'uploaded' AND updated_at < ?",
    [cutoff],
  );
  return result.changes;
}

export async function clearTombstoneInTransaction(
  entityType: string,
  entityId: string,
  externalId: string,
): Promise<void> {
  const database = requireNativeSqlite();
  await database.runAsync(
    "DELETE FROM sync_tombstones WHERE entity_type = ? AND entity_id = ? AND external_id = ?",
    [entityType, entityId, externalId],
  );
}
