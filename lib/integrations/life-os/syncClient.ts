import { Platform } from "react-native";
import { getCurrentUser } from "../../supabase/auth";
import { db } from "../../db/client";
import { getPendingDerivedStateInvalidations, markDerivedStateInvalidationProcessed } from "../../db/queries/domain-events";
import { isSupabaseConfigured, supabase } from "../../supabase/client";
import { type SyncRecord, validateSyncRecord } from "./exportSchema";
import { parseNutriLiftExternalId, resolveSourceEntity } from "./sourceResolver";
import { recordSyncAttempt } from "../../observability/telemetry";

async function recordSyncAttemptSafely(input: Parameters<typeof recordSyncAttempt>[0]): Promise<void> {
  try { await recordSyncAttempt(input); } catch { /* Telemetry must never alter sync correctness. */ }
}

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

async function acknowledgeSyncInvalidationsIfQueueDrained(): Promise<void> {
  try {
    const repository = await import("./syncRepository");
    const counts = await repository.getSyncQueueCounts();
    if (counts.pending > 0 || counts.uploading > 0 || counts.failed > 0 || counts.needs_attention > 0) return;
    const pending = await getPendingDerivedStateInvalidations(db, 500);
    for (const invalidation of pending) {
      if (invalidation.projection_key.startsWith("sync.")) {
        await markDerivedStateInvalidationProcessed(db, invalidation.id);
      }
    }
  } catch {
    // Keep invalidations pending if queue health cannot be proven.
  }
}

export async function upsertExternalFact(record: SyncRecord, userId: string) {
  if (!userId.trim()) throw new Error("A signed-in user ID is required to upsert an external fact.");
  const validation = validateSyncRecord({ ...record, userId });
  if (!validation.valid) throw new Error("External fact failed validation: " + (validation.errors ?? []).join("; "));
  if (record.deleted) throw new Error("Use retractExternalFact for a deleted source record.");
  return supabase.from("sync_records").upsert([toSupabaseSyncRow(record, userId)], { onConflict: "user_id,external_id" });
}

export async function retractExternalFact(record: SyncRecord, userId: string) {
  if (!record.externalId.trim()) throw new Error("External fact identity is required for retraction.");
  return upsertDeletedFact({ ...record, payload: {}, deleted: true }, userId);
}

async function upsertDeletedFact(record: SyncRecord, userId: string) {
  if (!userId.trim()) throw new Error("A signed-in user ID is required to retract an external fact.");
  const validation = validateSyncRecord({ ...record, userId });
  if (!validation.valid) throw new Error("External fact retraction failed validation: " + (validation.errors ?? []).join("; "));
  return supabase.from("sync_records").upsert([toSupabaseSyncRow({ ...record, payload: {}, deleted: true }, userId)], { onConflict: "user_id,external_id" });
}

export async function processSyncQueue(batchSize = 100): Promise<SyncResult> {
  const attemptStartedAt = Date.now();
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("Sync batch size must be an integer from 1 to 500.");
  }

  if (Platform.OS === "web") {
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Sync is available in the Android app. Web does not have the local SQLite database required for sync." };
  }

  if (!isSupabaseConfigured) {
    await recordSyncAttemptSafely({ outcome: "permanent_failure", latencyMs: Date.now() - attemptStartedAt, retryCategory: "not_configured", operationCount: 0 });
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Supabase is not configured." };
  }

  const { user, error: userError } = await getCurrentUser();
  if (userError || !user) {
    await recordSyncAttemptSafely({ outcome: "permanent_failure", latencyMs: Date.now() - attemptStartedAt, retryCategory: "authentication_required", operationCount: 0 });
    return { uploaded: 0, queued: 0, skipped: 0, needsAttention: 0, cursor: null, error: "Sign in before syncing NutriLift." };
  }

  const repository = await import("./syncRepository");
  const ownerBinding = await repository.bindSyncOwner(user.id);
  if (!ownerBinding.allowed) {
    await recordSyncAttemptSafely({ outcome: "permanent_failure", latencyMs: Date.now() - attemptStartedAt, retryCategory: "account_ownership_mismatch", operationCount: 0 });
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
  const sourceCheckedRecords = await Promise.all(changedRecords.map(async (record) => {
    if (record.deleted || !parseNutriLiftExternalId(record.externalId)) return record;
    const source = await resolveSourceEntity(record.externalId);
    if (!source?.exists || !source.current) return { ...record, payload: {}, deleted: true };
    return record;
  }));
  const classified = sourceCheckedRecords.map((record) => ({
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
    if (needsAttention === 0) await acknowledgeSyncInvalidationsIfQueueDrained();
    await recordSyncAttemptSafely({ outcome: needsAttention > 0 ? "permanent_failure" : "success", latencyMs: Date.now() - attemptStartedAt, retryCategory: needsAttention > 0 ? "invalid_records_quarantined" : null, operationCount: changedRecords.length, acceptedCount: 0, rejectedCount: needsAttention });
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
    const result = record.deleted
      ? await retractExternalFact(record, user.id)
      : await upsertExternalFact(record, user.id);
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
  if (failedItems.length === 0 && needsAttention === 0) await acknowledgeSyncInvalidationsIfQueueDrained();
  await recordSyncAttemptSafely({
    outcome: failedItems.length || needsAttention ? (failedItems.length ? "retryable_failure" : "permanent_failure") : "success",
    latencyMs: Date.now() - attemptStartedAt,
    retryCategory: failedItems.length ? "upload_failed" : needsAttention ? "invalid_records_quarantined" : null,
    operationCount: queuedRecords.length,
    acceptedCount: uploadedIds.length,
    rejectedCount: failedItems.length + needsAttention,
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


/** Backwards-compatible public entry point; the orchestration contract is processSyncQueue. */
export async function syncToSupabase(batchSize = 100): Promise<SyncResult> {
  return processSyncQueue(batchSize);
}
