export type SyncQueueState = "pending" | "uploading" | "uploaded" | "failed";

export type SyncQueueEntry = {
  id: string;
  externalId: string;
  state: SyncQueueState;
  sourceApp: "nutrilift";
  createdAt: string;
  updatedAt: string;
};

export const SYNC_QUEUE_STATES: SyncQueueState[] = ["pending", "uploading", "uploaded", "failed"];

export function createSyncQueueEntry(externalId: string): SyncQueueEntry {
  const now = new Date().toISOString();

  return {
    id: `sync:${externalId}`,
    externalId,
    state: "pending",
    sourceApp: "nutrilift",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSyncQueueState(entry: SyncQueueEntry, nextState: SyncQueueState): SyncQueueEntry {
  return {
    ...entry,
    state: nextState,
    updatedAt: new Date().toISOString(),
  };
}
