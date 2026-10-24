import { DatabaseSync } from "node:sqlite";
import { claimQueueRows, type QueueDatabase } from "./syncRepository";

jest.mock("../../db/client", () => ({ sqlite: null }));

function asQueueDatabase(database: DatabaseSync): QueueDatabase {
  return {
    runAsync: async (source: string, params?: (string | number | null)[]) =>
      database.prepare(source).run(...(params ?? [])),
    getAllAsync: async <T>(source: string, params?: (string | number | null)[]) =>
      database.prepare(source).all(...(params ?? [])) as T[],
  };
}

describe("sync queue leases", () => {
  it("reclaims a process-crashed upload after lease expiry without duplicating an active claim", async () => {
    const native = new DatabaseSync(":memory:");
    try {
      native.exec(`
        CREATE TABLE sync_queue (
          id TEXT PRIMARY KEY,
          external_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          state TEXT NOT NULL,
          attempt_count INTEGER NOT NULL,
          last_error TEXT,
          next_attempt_at TEXT,
          next_retry_at TEXT,
          lease_until TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO sync_queue VALUES (
          'sync:food-1', 'nutrilift:food_log:food-1', '{}', 'pending', 0,
          NULL, NULL, NULL, NULL, '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z'
        );
      `);
      const database = asQueueDatabase(native);
      const startedAt = "2026-10-24T00:00:00.000Z";

      const firstClaim = await claimQueueRows(database, 10, startedAt, 60_000);
      expect(firstClaim).toHaveLength(1);
      expect(firstClaim[0].attempt_count).toBe(1);

      const duplicateClaimBeforeLeaseExpiry = await claimQueueRows(
        database,
        10,
        "2026-10-24T00:00:30.000Z",
        60_000,
      );
      expect(duplicateClaimBeforeLeaseExpiry).toHaveLength(0);

      const relaunchedClaim = await claimQueueRows(
        database,
        10,
        "2026-10-24T00:01:00.001Z",
        60_000,
      );
      expect(relaunchedClaim).toHaveLength(1);
      expect(relaunchedClaim[0].external_id).toBe("nutrilift:food_log:food-1");
      expect(relaunchedClaim[0].attempt_count).toBe(2);
      expect(
        native.prepare("SELECT state FROM sync_queue WHERE id = 'sync:food-1'").get(),
      ).toEqual({ state: "uploading" });
    } finally {
      native.close();
    }
  });
});
