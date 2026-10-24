import { toSupabaseSyncRow, syncToSupabase } from "./syncClient";
import type { SyncRecord } from "./exportSchema";

const mockFetch = jest.fn();
const mockGetSession = jest.fn();
const mockRpc = jest.fn();
const mockClaimQueueBatch = jest.fn();
const mockEnqueueChangedRecords = jest.fn();
const mockEnqueueLegacyTombstones = jest.fn();
const mockFinishQueueBatch = jest.fn();
const mockPurgeUploadedQueue = jest.fn();
const mockSaveSyncState = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: unknown[]) => mockFetch(...args) },
}));
jest.mock("../../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
jest.mock("./syncRepository", () => ({
  claimQueueBatch: (...args: unknown[]) => mockClaimQueueBatch(...args),
  enqueueChangedRecords: (...args: unknown[]) => mockEnqueueChangedRecords(...args),
  enqueueLegacyTombstones: (...args: unknown[]) => mockEnqueueLegacyTombstones(...args),
  finishQueueBatch: (...args: unknown[]) => mockFinishQueueBatch(...args),
  purgeUploadedQueue: (...args: unknown[]) => mockPurgeUploadedQueue(...args),
  saveSyncState: (...args: unknown[]) => mockSaveSyncState(...args),
}));

describe("Supabase sync client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    mockEnqueueChangedRecords.mockResolvedValue({ queued: 1, rejected: 0 });
    mockEnqueueLegacyTombstones.mockResolvedValue({ queued: 0, rejected: 0 });
    mockClaimQueueBatch.mockResolvedValue([]);
    mockFinishQueueBatch.mockResolvedValue(undefined);
    mockPurgeUploadedQueue.mockResolvedValue(0);
    mockSaveSyncState.mockResolvedValue(undefined);
  });

  it("reports offline before attempting auth when there is no network", async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    await expect(syncToSupabase()).resolves.toMatchObject({
      status: "offline",
      error: "No internet connection; changes remain queued.",
    });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("marks a soft-deleted record as a server tombstone", () => {
    const record: SyncRecord = {
      schemaVersion: 1,
      sourceApp: "nutrilift",
      externalId: "nutrilift:food_log:meal-1",
      recordType: "body.nutrition.food_log",
      occurredAt: "2026-10-24T00:00:00.000Z",
      sourceUpdatedAt: "2026-10-25T00:00:00.000Z",
      payload: { id: "meal-1", row: { id: "meal-1", deleted_at: "2026-10-25T00:00:00.000Z" } },
      deleted: true,
    };

    expect(toSupabaseSyncRow(record)).toMatchObject({
      external_id: record.externalId,
      deleted_at: record.sourceUpdatedAt,
    });
  });

  it("uploads a deletion through the sync transport and tolerates duplicate delivery", async () => {
    const record: SyncRecord = {
      schemaVersion: 1,
      sourceApp: "nutrilift",
      externalId: "nutrilift:food_log:meal-1",
      recordType: "body.nutrition.food_log",
      occurredAt: "2026-10-24T00:00:00.000Z",
      sourceUpdatedAt: "2026-10-25T00:00:00.000Z",
      payload: { id: "meal-1", row: { id: "meal-1", deleted_at: "2026-10-25T00:00:00.000Z" } },
      deleted: true,
    };
    const queueRow = {
      id: "sync:nutrilift:food_log:meal-1",
      external_id: record.externalId,
      payload_json: JSON.stringify(record),
      attempt_count: 1,
    };
    mockClaimQueueBatch
      .mockResolvedValueOnce([queueRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([queueRow])
      .mockResolvedValueOnce([]);
    const fakeCloud = new Map<string, Record<string, unknown>>();
    mockRpc.mockImplementation(async (_functionName: string, args: { rows: Record<string, unknown>[] }) => {
      for (const row of args.rows) fakeCloud.set(String(row.external_id), row);
      return { error: null };
    });

    await expect(syncToSupabase()).resolves.toMatchObject({ uploaded: 1, status: "idle" });
    await expect(syncToSupabase()).resolves.toMatchObject({ uploaded: 1, status: "idle" });

    expect(fakeCloud.size).toBe(1);
    expect(fakeCloud.get(record.externalId)).toMatchObject({
      external_id: record.externalId,
      deleted_at: record.sourceUpdatedAt,
    });
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockFinishQueueBatch).toHaveBeenCalledTimes(2);
  });
});
