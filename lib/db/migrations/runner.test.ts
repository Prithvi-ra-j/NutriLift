import { DatabaseSync } from "node:sqlite";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { buildSanitizedV0Fixture } from "../../data/sanitizedMigrationFixture";
import * as schema from "../schema";
import { migrations } from "./index";
import { migrate, type MigrationDatabase } from "./runner";

function createDatabase(): {
  native: DatabaseSync;
  database: MigrationDatabase;
} {
  const native = new DatabaseSync(":memory:");
  const database: MigrationDatabase = {
    execAsync: async (source: string) => {
      native.exec(source);
    },
    getFirstAsync: async <T>(source: string) => {
      return (native.prepare(source).get() as T | undefined) ?? null;
    },
    getAllAsync: async <T>(source: string) => {
      return native.prepare(source).all() as T[];
    },
    withTransactionAsync: async (task) => {
      native.exec("BEGIN");
      try {
        await task();
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return { native, database };
}

describe("database migrations", () => {
  it("migrates a v0 install without losing rows and keeps the schema in parity", async () => {
    const { native, database } = createDatabase();
    try {
      await migrations[0].up(database);
      native.exec(
        buildSanitizedV0Fixture({
          foodLog: true,
          dailyNutrition: true,
          workoutSession: true,
          exerciseLog: true,
          setLog: true,
          recoveryLog: true,
          personalRecord: true,
        }),
      );
      expect(native.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 0,
      });

      await migrate(database, migrations.slice(0, 3));
      native.exec(`
        INSERT INTO exercise_logs (id, session_id, date, exercise_name, exercise_type)
          VALUES ('fixture-exercise-2', 'fixture-session-1', '2025-01-02', 'Fixture Plank', 'duration');
        INSERT INTO set_logs (id, exercise_log_id, set_number, weight_kg, reps, duration_sec, logged_at)
          VALUES ('fixture-set-2', 'fixture-exercise-2', 1, 0, 45, 45, 1735778400);
      `);

      await migrate(database, migrations);

      expect(native.prepare("PRAGMA user_version").get()).toEqual({
        user_version: migrations.length,
      });
      expect(
        native.prepare("SELECT exercise_type FROM exercise_logs WHERE id = 'fixture-exercise-1'").get(),
      ).toEqual({ exercise_type: "weight_reps" });
      expect(
        native.prepare("SELECT reps FROM set_logs WHERE id = 'fixture-set-2'").get(),
      ).toEqual({ reps: 0 });
      expect(
        native.prepare("SELECT estimated_1rm_kg FROM personal_records WHERE exercise_name = 'Fixture Exercise'").get(),
      ).toEqual({ estimated_1rm_kg: 66.6 });
      expect(
        native.prepare("PRAGMA table_info(personal_records)").all(),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "estimated_1rm_kg" })]),
      );
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM food_logs").get(),
      ).toEqual({ count: 1 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM daily_nutrition").get(),
      ).toEqual({ count: 1 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM workout_sessions").get(),
      ).toEqual({ count: 1 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM exercise_logs").get(),
      ).toEqual({ count: 2 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM set_logs").get(),
      ).toEqual({ count: 2 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM recovery_logs").get(),
      ).toEqual({ count: 1 });
      expect(
        native.prepare("SELECT COUNT(*) AS count FROM personal_records").get(),
      ).toEqual({ count: 1 });

      expect(
        native
          .prepare("SELECT updated_at FROM food_logs WHERE id = 'fixture-food-1'")
          .get(),
      ).toEqual({ updated_at: "2025-01-02T00:40:00.000Z" });
      expect(
        native
          .prepare("SELECT updated_at FROM set_logs WHERE id = 'fixture-set-1'")
          .get(),
      ).toEqual({ updated_at: "2025-01-02T00:40:00.000Z" });
      expect(
        native.prepare("SELECT name FROM sqlite_master WHERE name = 'custom_exercises'").get(),
      ).toEqual({ name: "custom_exercises" });
      expect(
        native.prepare("PRAGMA table_info(sync_queue)").all(),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "lease_until" }),
          expect.objectContaining({ name: "next_attempt_at" }),
        ]),
      );
      expect(
        native.prepare("SELECT name FROM sqlite_master WHERE name = 'sync_checkpoint'").get(),
      ).toEqual({ name: "sync_checkpoint" });

      for (const table of Object.values(schema)) {
        const expected = getTableConfig(table).columns
          .map((column) => column.name)
          .sort();
        const actual = (
          native.prepare(`PRAGMA table_info("${getTableConfig(table).name}")`).all() as {
            name: string;
          }[]
        )
          .map((column) => column.name)
          .sort();
        expect(actual).toEqual(expected);
      }

      await migrate(database, migrations);
      expect(native.prepare("PRAGMA user_version").get()).toEqual({
        user_version: migrations.length,
      });
    } finally {
      native.close();
    }
  });

  it("rolls back a failed migration and preserves the last completed version", async () => {
    const { native, database } = createDatabase();
    try {
      const failingMigrations = [
        ...migrations,
        {
          version: migrations.length + 1,
          name: "intentional_failure",
          up: async (db: MigrationDatabase) => {
            await db.execAsync("CREATE TABLE rollback_probe (id TEXT PRIMARY KEY)");
            throw new Error("migration failed");
          },
        },
      ];

      await expect(migrate(database, failingMigrations)).rejects.toThrow(
        "migration failed",
      );
      expect(native.prepare("PRAGMA user_version").get()).toEqual({
        user_version: migrations.length,
      });
      expect(
        native.prepare("SELECT name FROM sqlite_master WHERE name = 'rollback_probe'").get(),
      ).toBeUndefined();
    } finally {
      native.close();
    }
  });
});
