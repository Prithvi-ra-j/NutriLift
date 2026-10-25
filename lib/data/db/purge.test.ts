import { DatabaseSync } from "node:sqlite";
import { purgeUploadedDeletedRows } from "./purge";
import type { MigrationDatabase } from "./migrations/runner";
import { migrations } from "./migrations";
import { buildPersonalRecordExternalId } from "../../integrations/life-os/recordMappers";

let mockNative: DatabaseSync | null = null;

async function mockWithTransaction(task: () => Promise<void>): Promise<void> {
  if (!mockNative) throw new Error("The test SQLite database is not initialized.");
  mockNative.exec("BEGIN");
  try {
    await task();
    mockNative.exec("COMMIT");
  } catch (error) {
    mockNative.exec("ROLLBACK");
    throw error;
  }
}

jest.mock("./client", () => ({
  sqlite: {
    getFirstAsync: async <T>(source: string, params: (string | number | null)[] = []) => {
      if (!mockNative) throw new Error("The test SQLite database is not initialized.");
      return (mockNative.prepare(source).get(...params) as T | undefined) ?? null;
    },
    getAllAsync: async <T>(source: string, params: (string | number | null)[] = []) => {
      if (!mockNative) throw new Error("The test SQLite database is not initialized.");
      return mockNative.prepare(source).all(...params) as T[];
    },
    runAsync: async (source: string, params: (string | number | null)[] = []) => {
      if (!mockNative) throw new Error("The test SQLite database is not initialized.");
      const result = mockNative.prepare(source).run(...params);
      return { changes: Number(result.changes) };
    },
    withTransactionAsync: (task: () => Promise<void>) => mockWithTransaction(task),
  },
}));

jest.mock("../../logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

async function migrateTestDatabase(native: DatabaseSync): Promise<void> {
  const database: MigrationDatabase = {
    execAsync: async (source) => {
      native.exec(source);
    },
    getFirstAsync: async <T>(source: string) => {
      return (native.prepare(source).get() as T | undefined) ?? null;
    },
    getAllAsync: async <T>(source: string) => {
      return native.prepare(source).all() as T[];
    },
    withTransactionAsync: mockWithTransaction,
  };

  for (const migration of migrations) {
    await database.withTransactionAsync(async () => {
      await migration.up(database);
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

describe("purgeUploadedDeletedRows", () => {
  beforeEach(async () => {
    mockNative = new DatabaseSync(":memory:");
    mockNative.exec("PRAGMA foreign_keys = ON");
    await migrateTestDatabase(mockNative);
  });

  afterEach(() => {
    mockNative?.close();
    mockNative = null;
  });

  it("purges old synced rows child-first and retains rows without uploaded deletion receipts", async () => {
    const oldDeletedAt = "2020-01-01T00:00:00.000Z";
    const externalIds = [
      "nutrilift:set_log:set-1",
      "nutrilift:exercise_log:exercise-1",
      "nutrilift:workout_session:session-1",
      "nutrilift:food_log:food-1",
      "nutrilift:supplement_log:supplement-1",
      "nutrilift:body_stat:body-1",
      buildPersonalRecordExternalId("Fixture Exercise"),
    ];

    mockNative?.exec(`
      INSERT INTO workout_sessions (id, date, day_type, deleted_at)
        VALUES ('session-1', '2020-01-01', 'Push A', '${oldDeletedAt}');
      INSERT INTO exercise_logs (id, session_id, date, exercise_name, deleted_at)
        VALUES ('exercise-1', 'session-1', '2020-01-01', 'Fixture Exercise', '${oldDeletedAt}');
      INSERT INTO set_logs
        (id, exercise_log_id, set_number, weight_kg, reps, logged_at, deleted_at)
        VALUES ('set-1', 'exercise-1', 1, 50, 8, 1577836800, '${oldDeletedAt}');
      INSERT INTO food_logs
        (id, date, meal, name, calories, protein_g, carbs_g, fat_g, source, created_at, deleted_at)
        VALUES
        ('food-1', '2020-01-01', 'breakfast', 'Fixture Food', 100, 8, 1, 7, 'manual', 1577836800, '${oldDeletedAt}'),
        ('food-keep', '2020-01-01', 'lunch', 'Fixture Food', 100, 8, 1, 7, 'manual', 1577836800, '${oldDeletedAt}');
      INSERT INTO supplement_logs
        (id, date, supplement_name, taken, logged_at, updated_at, deleted_at)
        VALUES ('supplement-1', '2020-01-01', 'Fixture Supplement', 1, 1577836800, '${oldDeletedAt}', '${oldDeletedAt}');
      INSERT INTO body_stats (id, date, type, deleted_at)
        VALUES ('body-1', '2020-01-01', 'weight', '${oldDeletedAt}');
      INSERT INTO personal_records
        (exercise_name, best_weight_kg, achieved_date, updated_at, deleted_at)
        VALUES ('Fixture Exercise', 50, '2020-01-01', '${oldDeletedAt}', '${oldDeletedAt}');
    `);
    for (const externalId of externalIds) {
      if (externalId === "nutrilift:food_log:food-1") continue;
      mockNative?.prepare(
        `INSERT INTO sync_uploaded_deletions (external_id, uploaded_at)
         VALUES (?, ?)`,
      ).run(externalId, oldDeletedAt);
    }
    mockNative?.prepare(`
      INSERT INTO sync_queue
        (id, external_id, payload_json, state, attempt_count, created_at, updated_at)
      VALUES (?, ?, '{}', 'uploaded', 1, ?, ?)
    `).run(
      "sync:nutrilift:food_log:food-1",
      "nutrilift:food_log:food-1",
      oldDeletedAt,
      oldDeletedAt,
    );

    await expect(purgeUploadedDeletedRows()).resolves.toBe(7);

    expect(mockNative?.prepare("SELECT COUNT(*) AS count FROM set_logs").get()).toEqual({
      count: 0,
    });
    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM exercise_logs").get(),
    ).toEqual({ count: 0 });
    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM workout_sessions").get(),
    ).toEqual({ count: 0 });
    expect(mockNative?.prepare("SELECT id FROM food_logs").all()).toEqual([
      { id: "food-keep" },
    ]);
    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM supplement_logs").get(),
    ).toEqual({ count: 0 });
    expect(mockNative?.prepare("SELECT COUNT(*) AS count FROM body_stats").get()).toEqual({
      count: 0,
    });
    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM personal_records").get(),
    ).toEqual({ count: 0 });
  });
});
