import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { isSupabaseConfigured, supabase } from "../../supabase/client";
import { type SyncRecord } from "./exportSchema";
import {
  claimQueueBatch,
  enqueueChangedRecords,
  enqueueLegacyTombstones,
  finishQueueBatch,
  getQueueCounts,
  purgeUploadedQueue,
  retryRejectedRecords,
  saveSyncState,
} from "./syncRepository";

type SupabaseSyncRow = {
  external_id: string;
  record_type: string;
  source_app: "nutrilift";
  occurred_at: string;
  source_updated_at: string;
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
  status?: "idle" | "syncing" | "offline" | "signed-out" | "error";
};

export function toSupabaseSyncRow(record: SyncRecord): SupabaseSyncRow {
  return {
    external_id: record.externalId,
    record_type: record.recordType,
    source_app: "nutrilift",
    occurred_at: record.occurredAt,
    source_updated_at: record.sourceUpdatedAt,
    payload: record.payload,
    schema_version: record.schemaVersion,
    deleted_at: record.deleted ? record.sourceUpdatedAt : null,
  };
}

export async function syncToSupabase(batchSize = 200): Promise<SyncResult> {
  if (Platform.OS === "web") {
    return {
      uploaded: 0,
      queued: 0,
      skipped: 0,
      cursor: null,
      error: "Sync is available in the Android app. Web does not have the local SQLite database required for sync.",
      status: "error",
    };
  }
  if (!isSupabaseConfigured || !supabase) {
    return { uploaded: 0, queued: 0, skipped: 0, cursor: null, status: "idle" };
  }

  const network = await NetInfo.fetch();
  if (network.isConnected === false || network.isInternetReachable === false) {
    return {
      uploaded: 0,
      queued: 0,
      skipped: 0,
      cursor: null,
      error: "No internet connection; changes remain queued.",
      status: "offline",
    };
  }

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) {
    await saveSyncState({ error: authError.message });
    return { uploaded: 0, queued: 0, skipped: 0, cursor: null, error: authError.message, status: "error" };
  }
  if (!session) {
    return {
      uploaded: 0,
      queued: 0,
      skipped: 0,
      cursor: null,
      error: "Sign in before syncing NutriLift.",
      status: "signed-out",
    };
  }

  await purgeUploadedQueue();
  const discovered = await enqueueChangedRecords();
  const legacy = await enqueueLegacyTombstones();
  let uploaded = 0;
  const requestedBatchSize = Math.max(1, Math.min(200, batchSize));

  while (true) {
    const claimed = await claimQueueBatch(requestedBatchSize);
    if (claimed.length === 0) break;
    const queuedRecords = claimed.map((row) => JSON.parse(row.payload_json) as SyncRecord);
    const { error } = await supabase.rpc(
      "upsert_sync_records",
      { rows: queuedRecords.map(toSupabaseSyncRow) },
    );
    if (error) {
      await finishQueueBatch(claimed, { success: false, error: error.message });
      await saveSyncState({ error: error.message });
      return {
        uploaded,
        queued: discovered.queued + legacy.queued,
        skipped: discovered.rejected + legacy.rejected,
        cursor: null,
        error: error.message,
        status: "error",
      };
    }
    await finishQueueBatch(claimed, { success: true });
    uploaded += claimed.length;
  }

  await saveSyncState({ success: true });
  return {
    uploaded,
    queued: discovered.queued + legacy.queued,
    skipped: discovered.rejected + legacy.rejected,
    cursor: null,
    status: "idle",
  };
}

export async function retryRejectedSync(): Promise<number> {
  return retryRejectedRecords();
}

export async function getSyncQueueCounts() {
  return getQueueCounts();
}
