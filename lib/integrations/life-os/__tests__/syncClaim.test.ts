jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../../db/client", () => ({
  sqlite: {
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withExclusiveTransactionAsync: jest.fn(),
  },
}));

import { sqlite } from "../../../db/client";
import { claimQueuedRecords } from "../syncRepository";
import type { SyncRecord } from "../exportSchema";

const mockedSqlite = jest.mocked(sqlite as unknown as {
  withExclusiveTransactionAsync: jest.Mock;
});

const record: SyncRecord = {
  schemaVersion: 1,
  sourceApp: "nutrilift",
  externalId: "nutrilift:body.training.session:session-1",
  recordType: "body.training.session",
  occurredAt: "2026-10-15T06:00:00.000Z",
  sourceUpdatedAt: "2026-10-15T06:10:00.000Z",
  payload: { durationMin: 45, totalVolumeKg: 2500 },
  deleted: false,
};

describe("claimQueuedRecords", () => {
  beforeEach(() => jest.clearAllMocks());

  it("claims eligible queue rows under one exclusive transaction", async () => {
    const tx = {
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([{ external_id: record.externalId }])
        .mockResolvedValueOnce([{ payload_json: JSON.stringify(record) }]),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    };
    mockedSqlite.withExclusiveTransactionAsync.mockImplementation(async (callback) => callback(tx));

    await expect(claimQueuedRecords(10)).resolves.toEqual([record]);
    expect(mockedSqlite.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(tx.getAllAsync).toHaveBeenCalledTimes(2);
    expect(tx.runAsync.mock.calls[0][0]).toContain("state = 'uploading'");
    expect(tx.runAsync.mock.calls[0][0]).toContain("state IN ('pending', 'failed')");
  });

  it("rejects unbounded batch sizes before opening a transaction", async () => {
    await expect(claimQueuedRecords(501)).rejects.toThrow("integer from 1 to 500");
    expect(mockedSqlite.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });

  it("does not issue a write when no eligible records exist", async () => {
    const tx = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn(),
    };
    mockedSqlite.withExclusiveTransactionAsync.mockImplementation(async (callback) => callback(tx));

    await expect(claimQueuedRecords()).resolves.toEqual([]);
    expect(tx.runAsync).not.toHaveBeenCalled();
  });
});
