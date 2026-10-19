jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../../db/client", () => ({
  sqlite: { runAsync: jest.fn(), getAllAsync: jest.fn() },
}));

import { sqlite } from "../../../db/client";
import { enqueueNeedsAttentionRecords, getSyncQueueCounts } from "../syncRepository";
import type { SyncRecord } from "../exportSchema";

const mockedSqlite = jest.mocked(sqlite as unknown as {
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
});

const invalidRecord: SyncRecord = {
  schemaVersion: 1,
  sourceApp: "nutrilift",
  externalId: "nutrilift:body.measurement:bad",
  recordType: "body.measurement",
  occurredAt: "2026-10-15T10:00:00.000Z",
  sourceUpdatedAt: "2026-10-15T10:01:00.000Z",
  payload: { weightKg: -1 },
  deleted: false,
};

describe("sync quarantine", () => {
  beforeEach(() => jest.clearAllMocks());

  it("persists invalid projections in a non-retryable needs-attention state", async () => {
    await enqueueNeedsAttentionRecords([{
      record: invalidRecord,
      errors: ["Numeric values are negative when they should not be"],
    }]);

    expect(mockedSqlite.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = mockedSqlite.runAsync.mock.calls[0];
    expect(sql).toContain("'needs_attention'");
    expect(sql).toContain("ON CONFLICT(external_id) DO UPDATE");
    expect(params[1]).toBe(invalidRecord.externalId);
    expect(params[2]).toBe(JSON.stringify(invalidRecord));
    expect(params[3]).toContain("negative");
  });

  it("uses a stable quarantine identity when an external ID is missing", async () => {
    await enqueueNeedsAttentionRecords([{
      record: { ...invalidRecord, externalId: "" },
      errors: ["Missing externalId"],
    }]);

    const [, params] = mockedSqlite.runAsync.mock.calls[0];
    expect(params[1]).toMatch(/^needs-attention:body\.measurement:/);
  });

  it("exposes the needs-attention count alongside other queue states", async () => {
    mockedSqlite.getAllAsync.mockResolvedValue([
      { state: "pending", count: 2 },
      { state: "needs_attention", count: 3 },
      { state: "failed", count: 1 },
    ]);

    await expect(getSyncQueueCounts()).resolves.toEqual({
      pending: 2,
      uploading: 0,
      uploaded: 0,
      failed: 1,
      needs_attention: 3,
    });
  });
});
