import { DatabaseSync } from "node:sqlite";
import {
  claimQueueRows,
  finishQueueRows,
  persistPageToDatabase,
  type QueueDatabase,
  type SyncTable,
} from "./syncRepository";

jest.mock("../../data/db/client", () => ({ sqlite: null }));

function asQueueDatabase(database: DatabaseSync): QueueDatabase {
  return {
    runAsync: async (source: string, params?: (string | number | null)[]) =>
      database.prepare(source).run(...(params ?? [])),
    getAllAsync: async <T>(source: string, params?: (string | number | null)[]) =>
      database.prepare(source).all(...(params ?? [])) as T[],
  };
}

describe("sync queue leases", () => {
  it("rejects an invalid row and advances its checkpoint", async () => {
    const native = new DatabaseSync(":memory:");
    try {
      native.exec(`
        CREATE TABLE sync_queue (
          id TEXT PRIMARY KEY,
          external_id TEXT NOT NULL UNIQUE,
          payload_json TEXT NOT NULL,
          state TEXT NOT NULL,
          attempt_count INTEGER NOT NULL,
          last_error TEXT,
          next_retry_at TEXT,
          next_attempt_at TEXT,
          lease_until TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE sync_checkpoint (
          source_table TEXT PRIMARY KEY,
          last_updated_at TEXT NOT NULL,
          last_id TEXT NOT NULL
        );
      `);
      const table: SyncTable = {
        name: "food_logs",
        idColumn: "id",
        map: () => {
          throw new Error("missing_updated_at");
        },
      };

      await expect(persistPageToDatabase(
        asQueueDatabase(native),
        table,
        [{ id: "invalid-food", updated_at: "2026-10-25T12:00:00.000Z" }],
        "2026-10-25T12:01:00.000Z",
      )).resolves.toEqual({ queued: 0, rejected: 1 });

      expect(native.prepare("SELECT state, last_error FROM sync_queue").get()).toEqual({
        state: "rejected",
        last_error: "missing_updated_at",
      });
      expect(native.prepare("SELECT last_updated_at, last_id FROM sync_checkpoint").get()).toEqual({
        last_updated_at: "2026-10-25T12:00:00.000Z",
        last_id: "invalid-food",
      });
    } finally {
      native.close();
    }
  });

  it("reclaims an upload after a crash and safely completes duplicate delivery", async () => {
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
      const claimedRow = firstClaim.at(0);
      if (!claimedRow) throw new Error("Expected the first queue claim.");
      expect(claimedRow.attempt_count).toBe(1);
      const fakeCloud = new Map<string, string>();
      fakeCloud.set(claimedRow.external_id, claimedRow.payload_json);

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
      const relaunchedRow = relaunchedClaim.at(0);
      if (!relaunchedRow) throw new Error("Expected the relaunched queue claim.");
      expect(relaunchedRow.external_id).toBe("nutrilift:food_log:food-1");
      expect(relaunchedRow.attempt_count).toBe(2);

      fakeCloud.set(relaunchedRow.external_id, relaunchedRow.payload_json);
      await finishQueueRows(
        database,
        relaunchedClaim,
        { success: true },
        "2026-10-24T00:01:01.000Z",
      );
      expect(
        native.prepare("SELECT state FROM sync_queue WHERE id = 'sync:food-1'").get(),
      ).toEqual({ state: "uploaded" });
      expect(fakeCloud.size).toBe(1);
      expect(await claimQueueRows(database, 10, "2026-10-24T00:01:02.000Z", 60_000)).toHaveLength(0);
    } finally {
      native.close();
    }
  });
});
