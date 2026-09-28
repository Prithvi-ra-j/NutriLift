import { Platform } from "react-native";
import { getCurrentUser } from "../../supabase/auth";
import { isSupabaseConfigured, supabase } from "../../supabase/client";
import { type SyncRecord, validateSyncRecord } from "./exportSchema";

type SupabaseSyncRow = {
  user_id: string;
  external_id: string;
  record_type: string;
  source_app: "nutrilift";
  occurred_at: string;
  source_updated_at?: string;
  payload: Record<string, unknown>;
  schema_version: number;
  deleted_at: string | null;
};

export type SyncResult = {
  uploaded: number;
  queued: number;
  skipped: number;
  cursor: string | null;
  error?: string;
};

export function toSupabaseSyncRow(record: SyncRecord, userId: string): SupabaseSyncRow {
  const sourceUpdatedAt: string | undefined = record.sourceUpdatedAt ?? undefined;

  return {
    user_id: userId,
    external_id: record.externalId,
    record_type: record.recordType,
    source_app: "nutrilift",
    occurred_at: record.occurredAt,
    source_updated_at: sourceUpdatedAt,
    payload: record.payload,
    schema_version: record.schemaVersion,
    deleted_at: record.deleted ? sourceUpdatedAt ?? new Date().toISOString() : null,
  };
}

export async function syncToSupabase(batchSize = 100): Promise<SyncResult> {
  if (Platform.OS === "web") {
    return { uploaded: 0, queued: 0, skipped: 0, cursor: null, error: "Sync is available in the Android app. Web does not have the local SQLite database required for sync." };
  }

  if (!isSupabaseConfigured) {
    return { uploaded: 0, queued: 0, skipped: 0, cursor: null, error: "Supabase is not configured." };
  }

  const { user, error: userError } = await getCurrentUser();
  if (userError || !user) {
    return { uploaded: 0, queued: 0, skipped: 0, cursor: null, error: "Sign in before syncing NutriLift." };
  }

  const repository = await import("./syncRepository");
  const cursor = await repository.getSyncCursor();
  const changedRecords = await repository.getChangedRecords(cursor);
  const validation = changedRecords.map((record) => ({
    record,
    result: validateSyncRecord({ ...record, userId: user.id }),
  }));
  const validChangedRecords = validation.filter((entry) => entry.result.valid).map((entry) => entry.record);
  const invalidChangedRecords = validation.filter((entry) => !entry.result.valid);
  await repository.enqueueRecords(validChangedRecords);

  const queuedRecords = await repository.getQueuedRecords(batchSize);
  if (queuedRecords.length === 0) {
    await repository.saveSyncState({ cursor: cursor ?? undefined, success: true });
    return { uploaded: 0, queued: validChangedRecords.length, skipped: changedRecords.length - validChangedRecords.length, cursor };
  }

  const externalIds = queuedRecords.map((record) => record.externalId);
  await repository.setQueueState(externalIds, "uploading");
  const { error } = await supabase
    .from("sync_records")
    .upsert(queuedRecords.map((record) => toSupabaseSyncRow(record, user.id)), { onConflict: "user_id,external_id" });

  if (error) {
    await repository.setQueueState(externalIds, "failed", error.message);
    await repository.saveSyncState({ error: error.message });
    return { uploaded: 0, queued: validChangedRecords.length, skipped: changedRecords.length - validChangedRecords.length, cursor, error: error.message };
  }

  await repository.setQueueState(externalIds, "uploaded");

  // Never advance past a rejected source record. Re-reading uploaded records is
  // safe because the Supabase write is an idempotent upsert on external_id.
  const canAdvance = invalidChangedRecords.length === 0 && validChangedRecords.length <= batchSize;
  const nextCursor = canAdvance
    ? (repository.newestSourceTimestamp(queuedRecords) ?? cursor)
    : cursor;

  if (invalidChangedRecords.length > 0) {
    await repository.saveSyncState({
      cursor: cursor ?? undefined,
      error: `${invalidChangedRecords.length} changed record(s) were rejected; cursor was not advanced.`,
    });
  } else {
    await repository.saveSyncState({ cursor: nextCursor ?? undefined, success: true });
  }

  return {
    uploaded: queuedRecords.length,
    queued: validChangedRecords.length,
    skipped: invalidChangedRecords.length,
    cursor: nextCursor,
    error: invalidChangedRecords.length > 0
      ? `${invalidChangedRecords.length} changed record(s) were rejected; retry after fixing the source data.`
      : undefined,
  };
}

export async function retryFailedSync(): Promise<SyncResult> {
  return syncToSupabase();
}
