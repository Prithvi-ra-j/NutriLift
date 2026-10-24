import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { onCommit } from "../db/tx";
import { onForeground } from "../lifecycle/foreground";
import { logger } from "../logger";
import { createSingleFlight } from "./singleFlight";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import {
  getQueueCounts,
  getSyncMetadata,
  type SyncQueueCounts,
} from "../integrations/life-os/syncRepository";
import { syncToSupabase, type SyncResult } from "../integrations/life-os/syncClient";

export type SyncStatus = "idle" | "syncing" | "offline" | "signed-out" | "error";

export type SyncSnapshot = {
  status: SyncStatus;
  pending: number;
  rejected: number;
  lastSuccessAt: string | null;
  lastError: string | null;
};

type SyncListener = () => void;

const emptyCounts: SyncQueueCounts = {
  pending: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
  rejected: 0,
  dead: 0,
};

let snapshot: SyncSnapshot = {
  status: "idle",
  pending: 0,
  rejected: 0,
  lastSuccessAt: null,
  lastError: null,
};
let queueCounts = emptyCounts;
const listeners = new Set<SyncListener>();

function publish(next: Partial<SyncSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of [...listeners]) listener();
}

export function getSyncSnapshot(): SyncSnapshot {
  return snapshot;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshSyncStatus(): Promise<void> {
  try {
    const [counts, metadata] = await Promise.all([getQueueCounts(), getSyncMetadata()]);
    queueCounts = counts;
    publish({
      pending: counts.pending + counts.uploading + counts.failed,
      rejected: counts.rejected + counts.dead,
      lastSuccessAt: metadata.lastSuccessAt,
      lastError: metadata.lastError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Unable to read local sync status", { error: message });
    publish({ status: "error", lastError: message });
  }
}

const runSync = createSingleFlight<SyncResult>(async (reason) => {
  if (snapshot.status === "offline") {
    return {
      uploaded: 0,
      queued: queueCounts.pending,
      skipped: 0,
      cursor: null,
      error: "No internet connection; changes remain queued.",
      status: "offline",
    };
  }

  publish({ status: "syncing", lastError: null });
  try {
    const result = await syncToSupabase();
    if (result.error && result.status !== "signed-out") {
      logger.warn("Sync attempt did not complete", { reason, error: result.error });
    }
    await refreshSyncStatus();
    publish({
      status: result.status ?? (result.error ? "error" : "idle"),
      lastError: result.error ?? null,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Sync attempt failed", { reason, error: message });
    publish({ status: "error", lastError: message });
    return {
      uploaded: 0,
      queued: queueCounts.pending,
      skipped: 0,
      cursor: null,
      error: message,
      status: "error",
    };
  }
});

export function requestSync(reason: string): Promise<SyncResult> {
  return runSync(reason);
}

export async function retryRejectedAndSync(): Promise<SyncResult> {
  const { retryRejectedSync } = await import("../integrations/life-os/syncClient");
  await retryRejectedSync();
  await refreshSyncStatus();
  return requestSync("retry-rejected");
}

export function startSyncTriggers(): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let wasOnline: boolean | null = null;

  const unsubscribeForeground = onForeground(() => {
    void requestSync("foreground");
  });
  const unsubscribeCommit = onCommit(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void requestSync("committed-write");
    }, 5_000);
  });
  const unsubscribeNetwork = NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    const reconnected = wasOnline === false && online;
    wasOnline = online;
    if (!online && !runSync.isRunning) publish({ status: "offline" });
    else if (online && snapshot.status === "offline") publish({ status: "idle" });
    if (reconnected) void requestSync("network-restored");
  });
  const authListener = supabase?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") publish({ status: "signed-out", lastError: null });
    if (event === "SIGNED_IN") void requestSync("signed-in");
  });

  if (!isSupabaseConfigured) publish({ status: "idle" });

  return () => {
    unsubscribeForeground();
    unsubscribeCommit();
    unsubscribeNetwork();
    authListener?.data.subscription.unsubscribe();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

export function useSyncStatus(): SyncSnapshot {
  const [value, setValue] = useState(snapshot);
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(() => setValue(getSyncSnapshot()));
    void refreshSyncStatus();
    return unsubscribe;
  }, []);
  return value;
}
