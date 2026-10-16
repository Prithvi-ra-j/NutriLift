jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../supabase/auth", () => ({
  getCurrentUser: jest.fn(async () => ({ user: { id: "user-1" }, error: null })),
}));
jest.mock("../../db/client", () => ({ db: {} }));
jest.mock("../../db/queries/domain-events", () => ({
  getPendingDerivedStateInvalidations: jest.fn(async () => []),
  markDerivedStateInvalidationProcessed: jest.fn(async () => undefined),
}));
jest.mock("../../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: { from: jest.fn() },
}));
jest.mock("./exportSchema", () => ({
  validateSyncRecord: jest.fn(() => ({ valid: true, errors: [] })),
}));
jest.mock("./sourceResolver", () => ({
  parseNutriLiftExternalId: jest.fn(() => null),
  resolveSourceEntity: jest.fn(),
}));
jest.mock("../../observability/telemetry", () => ({
  recordSyncAttempt: jest.fn(async () => undefined),
}));
jest.mock("./syncRepository", () => ({
  bindSyncOwner: jest.fn(async () => ({ allowed: true, ownerUserId: "user-1" })),
  recoverInterruptedSyncOperations: jest.fn(async () => undefined),
  getSyncCursor: jest.fn(async () => null),
  getChangedRecords: jest.fn(async () => []),
  enqueueRecords: jest.fn(async () => undefined),
  enqueueNeedsAttentionRecords: jest.fn(async () => undefined),
  claimQueuedRecords: jest.fn(async () => []),
  newestSourceTimestamp: jest.fn(() => "2026-10-16T10:00:00.000Z"),
  setQueueState: jest.fn(async () => undefined),
  saveSyncState: jest.fn(async () => undefined),
  getSyncQueueCounts: jest.fn(async () => ({ pending: 0, uploading: 0, failed: 0, needs_attention: 0 })),
}));

import { supabase } from "../../supabase/client";
import { recordSyncAttempt } from "../../observability/telemetry";
import * as repository from "./syncRepository";
import { processSyncQueue } from "./syncClient";
import type { SyncRecord } from "./exportSchema";

const mockFrom = supabase.from as jest.Mock;

const record: SyncRecord = {
  externalId: "custom:workout-1",
  recordType: "workout_session",
  sourceApp: "nutrilift",
  occurredAt: "2026-10-16T10:00:00.000Z",
  sourceUpdatedAt: "2026-10-16T10:00:00.000Z",
  payload: { status: "completed" },
  schemaVersion: 1,
  deleted: false,
};

describe("sync client network failure handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (repository.getChangedRecords as jest.Mock).mockResolvedValue([record]);
    (repository.claimQueuedRecords as jest.Mock).mockResolvedValue([record]);
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockRejectedValue(new Error("network unreachable")),
    });
  });

  it("marks thrown batch uploads retryable and keeps local records queued", async () => {
    const result = await processSyncQueue();

    expect(result.uploaded).toBe(0);
    expect(result.error).toContain("local copies remain queued for retry");
    expect(result.error).toContain("network unreachable");
    expect(repository.setQueueState).toHaveBeenCalledWith([], "uploaded");
    expect(repository.setQueueState).toHaveBeenCalledWith(["custom:workout-1"], "failed", "network unreachable");
    expect(repository.saveSyncState).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining("network unreachable"),
    }));
    expect(recordSyncAttempt).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "retryable_failure",
      retryCategory: "upload_failed",
      acceptedCount: 0,
      rejectedCount: 1,
    }));
  });

  it("does not claim a remote source was deleted when source resolution is unavailable", async () => {
    // Non-NutriLift external IDs are not looked up against the local source resolver.
    // They still remain retryable if the remote upload throws.
    const result = await processSyncQueue();
    expect(result.uploaded).toBe(0);
    expect(repository.setQueueState).toHaveBeenCalledWith(["custom:workout-1"], "failed", "network unreachable");
  });
});
