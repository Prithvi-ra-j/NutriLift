const mockAddEventListener = jest.fn();
const mockGetQueueCounts = jest.fn();
const mockGetSyncMetadata = jest.fn();
const mockSyncToSupabase = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
}));

jest.mock("../db/tx", () => ({ onCommit: jest.fn(() => jest.fn()) }));
jest.mock("../lifecycle/foreground", () => ({ onForeground: jest.fn(() => jest.fn()) }));
jest.mock("../logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock("../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) },
  },
}));
jest.mock("../integrations/life-os/syncRepository", () => ({
  getQueueCounts: (...args: unknown[]) => mockGetQueueCounts(...args),
  getSyncMetadata: (...args: unknown[]) => mockGetSyncMetadata(...args),
}));
jest.mock("../integrations/life-os/syncClient", () => ({
  syncToSupabase: (...args: unknown[]) => mockSyncToSupabase(...args),
}));

const emptyQueueCounts = {
  pending: 0,
  uploading: 0,
  uploaded: 0,
  failed: 0,
  rejected: 0,
  dead: 0,
};

describe("sync engine network reconnect", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetQueueCounts.mockResolvedValue(emptyQueueCounts);
    mockGetSyncMetadata.mockResolvedValue({ lastSuccessAt: null, lastError: null });
    mockSyncToSupabase.mockResolvedValue({
      uploaded: 1,
      queued: 0,
      skipped: 0,
      cursor: null,
      status: "idle",
    });
  });

  it("publishes online status before syncing after connectivity returns", async () => {
    let reportNetworkState: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;
    mockAddEventListener.mockImplementation((listener: typeof reportNetworkState) => {
      reportNetworkState = listener;
      return jest.fn();
    });

    const { getSyncSnapshot, startSyncTriggers } = jest.requireActual<typeof import("./syncEngine")>("./syncEngine");
    const stop = startSyncTriggers();
    reportNetworkState?.({ isConnected: false, isInternetReachable: false });
    expect(getSyncSnapshot().status).toBe("offline");

    reportNetworkState?.({ isConnected: true, isInternetReachable: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSyncToSupabase).toHaveBeenCalledTimes(1);
    expect(getSyncSnapshot().status).toBe("idle");
    stop();
  });

  it("aggregates queue states and exposes the latest sync metadata", async () => {
    mockGetQueueCounts.mockResolvedValue({
      pending: 2,
      uploading: 3,
      uploaded: 7,
      failed: 4,
      rejected: 5,
      dead: 6,
    });
    mockGetSyncMetadata.mockResolvedValue({
      lastSuccessAt: "2026-10-25T12:00:00.000Z",
      lastError: "The last upload failed.",
    });

    const { getSyncSnapshot, refreshSyncStatus } = jest.requireActual<typeof import("./syncEngine")>("./syncEngine");
    await refreshSyncStatus();

    expect(getSyncSnapshot()).toMatchObject({
      pending: 9,
      rejected: 11,
      lastSuccessAt: "2026-10-25T12:00:00.000Z",
      lastError: "The last upload failed.",
    });
  });
});
