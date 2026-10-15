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
  needsAttention: number;
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
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("Sync batch size must be an integer from 1 to 500.");
  }

  if (Platform.OS === "web") {
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Sync is available in the Android app. Web does not have the local SQLite database required for sync." };
  }

  if (!isSupabaseConfigured) {
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Supabase is not configured." };
  }

  const { user, error: userError } = await getCurrentUser();
  if (userError || !user) {
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Sign in before syncing NutriLift." };
  }

  const repository = await import("./syncRepository");
  const ownerBinding = await repository.bindSyncOwner(user.id);
  if (!ownerBinding.allowed) {
    return {
      uploaded: 0,
      queued: 0,
      skipped: 0,
      needsAttention: 0,
      cursor: null,
      error: "This local NutriLift dataset is linked to another account. Clear or explicitly transfer local data before syncing with a different account.",
    };
  }
  await repository.recoverInterruptedSyncOperations();
  const cursor = await repository.getSyncCursor();
  const changedRecords = await repository.getChangedRecords(cursor);
  const classified = changedRecords.map((record) => ({
    record,
    validation: validateSyncRecord({ ...record, userId: user.id }),
  }));
  const validChangedRecords = classified.filter((item) => item.validation.valid).map((item) => item.record);
  const needsAttentionRecords = classified
    .filter((item) => !item.validation.valid)
    .map((item) => ({ record: item.record, errors: item.validation.errors ?? ["Sync payload failed validation."] }));

  // Persist every discovered change before moving the cursor. Invalid records are
  // quarantined visibly so they cannot disappear when later valid records advance it.
  await repository.enqueueRecords(validChangedRecords);
  await repository.enqueueNeedsAttentionRecords(needsAttentionRecords);
  const needsAttention = needsAttentionRecords.length;

  const queuedRecords = await repository.claimQueuedRecords(batchSize);
  const nextCursor = repository.newestSourceTimestamp(changedRecords) ?? cursor;
  if (queuedRecords.length === 0) {
    await repository.saveSyncState({ cursor: nextCursor ?? undefined, success: true });
    return {
      uploaded: 0,
      queued: validChangedRecords.length,
      skipped: needsAttention,
      needsAttention,
      cursor: nextCursor,
    };
  }

  const uploadedIds: string[] = [];
  const failedItems: Array<{ externalId: string; message: string }> = [];
  const uploadOne = async (record: SyncRecord) => {
    const result = await supabase
      .from("sync_records")
      .upsert([toSupabaseSyncRow(record, user.id)], { onConflict: "user_id,external_id" });
    return result.error;
  };

  // Batch the common case. If the server rejects a batch for a record-level
  // constraint, isolate the bad row so unrelated valid records still progress.
  for (let offset = 0; offset < queuedRecords.length; offset += 20) {
    const batch = queuedRecords.slice(offset, offset + 20);
    const batchResult = await supabase
      .from("sync_records")
      .upsert(batch.map((record) => toSupabaseSyncRow(record, user.id)), { onConflict: "user_id,external_id" });
    if (!batchResult.error) {
      uploadedIds.push(...batch.map((record) => record.externalId));
      continue;
    }

    const status = Number((batchResult.error as { status?: number }).status ?? 0);
    if (status === 400 || status === 409 || status === 422) {
      for (const record of batch) {
        const rowError = await uploadOne(record);
        if (rowError) failedItems.push({ externalId: record.externalId, message: rowError.message });
        else uploadedIds.push(record.externalId);
      }
    } else {
      for (const record of batch) {
        failedItems.push({ externalId: record.externalId, message: batchResult.error.message });
      }
    }
  }

  await repository.setQueueState(uploadedIds, "uploaded");
  for (const failure of failedItems) {
    await repository.setQueueState([failure.externalId], "failed", failure.message);
  }

  const failureSummary = failedItems.length
    ? `${failedItems.length} sync record(s) failed; local copies remain queued for retry. First error: ${failedItems[0].message}`
    : undefined;
  await repository.saveSyncState({
    cursor: nextCursor ?? undefined,
    error: failureSummary ?? null,
    success: failedItems.length === 0,
  });

  return {
    uploaded: uploadedIds.length,
    queued: validChangedRecords.length,
    skipped: needsAttention,
    needsAttention,
    cursor: nextCursor,
    ...(failureSummary ? { error: failureSummary } : {}),
  };
}

export async function retryFailedSync(): Promise<SyncResult> {
  return syncToSupabase();
}
