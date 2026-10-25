import { nowIso, nowUnix } from "../../time/clock";

export type SyncQueueState = "pending" | "uploading" | "uploaded" | "failed" | "rejected" | "dead";

export type SyncQueueEntry = {
  id: string;
  externalId: string;
  state: SyncQueueState;
  sourceApp: "nutrilift";
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  leaseUntil: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
};

export const SYNC_QUEUE_STATES: SyncQueueState[] = [
  "pending",
  "uploading",
  "uploaded",
  "failed",
  "rejected",
  "dead",
];

export function createSyncQueueEntry(externalId: string): SyncQueueEntry {
  const now = nowIso();

  return {
    id: `sync:${externalId}`,
    externalId,
    state: "pending",
    sourceApp: "nutrilift",
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    leaseUntil: null,
    nextAttemptAt: null,
    lastError: null,
  };
}

export function updateSyncQueueState(entry: SyncQueueEntry, nextState: SyncQueueState): SyncQueueEntry {
  return {
    ...entry,
    state: nextState,
    updatedAt: nowIso(),
  };
}

export function nextRetryAt(attemptCount: number, now = nowUnix() * 1000): string {
  const delayMs = Math.min(30_000 * (2 ** Math.max(0, attemptCount)), 6 * 60 * 60 * 1000);
  return new Date(now + delayMs).toISOString();
}
