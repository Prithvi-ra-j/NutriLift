/**
 * Runtime migration integration tests against a real in-memory SQLite database.
 * Node 22 provides node:sqlite; CI uses Node 22. No native Expo runtime is required.
 */
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: () => (global as any).__nutriLiftSqliteAdapter,
}));
jest.mock("drizzle-orm/expo-sqlite", () => ({ drizzle: () => ({}) }));

const { DatabaseSync } = require("node:sqlite");
import { REQUIRED_CORE_TABLES } from "../migration-contract";

type SQLiteAdapter = {
  execAsync: (sql: string) => Promise<void>;
  getAllAsync: (sql: string) => Promise<any[]>;
};

function installDatabase(database: any): SQLiteAdapter {
  const adapter: SQLiteAdapter = {
    execAsync: async (sql) => database.exec(sql),
    getAllAsync: async (sql) => database.prepare(sql).all(),
  };
  (global as any).__nutriLiftSqliteAdapter = adapter;
  return adapter;
}

async function loadMigrations() {
  jest.resetModules();
  return require("../client").runMigrations as () => Promise<void>;
}

describe("runtime SQLite migrations", () => {
  afterEach(() => {
    delete (global as any).__nutriLiftSqliteAdapter;
    jest.resetModules();
  });


  it("executes the clean-install Drizzle SQL snapshot successfully", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const migrationSql = readFileSync(
      join(__dirname, "../../../drizzle/0000_wakeful_supernaut.sql"),
      "utf8",
    );
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(migrationSql);
      const tables = new Set<string>(
        database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
          .map((row: { name: string }) => row.name),
      );
      for (const table of [
        "food_logs", "daily_nutrition", "workout_sessions", "exercise_logs",
        "set_logs", "custom_exercises", "sync_tombstones", "sync_queue", "sync_state",
        "nutrition_profile", "nutrition_target_history", "recommendation_outcomes", "domain_events", "derived_state_invalidations", "app_telemetry_events", "favorite_foods", "repeatable_meals",
      ]) {
        expect(tables.has(table)).toBe(true);
      }
      for (const [table, column] of [
        ["daily_nutrition", "updated_at"],
        ["daily_nutrition", "is_complete"],
        ["daily_nutrition", "completed_at"],
        ["workout_sessions", "updated_at"],
        ["workout_sessions", "status"],
        ["personal_records", "updated_at"],
        ["body_stats", "updated_at"],
        ["recovery_logs", "updated_at"],
        ["sync_tombstones", "external_id"],
        ["nutrition_target_history", "goal"],
        ["sync_state", "owner_user_id"],
      ]) {
        expect(
          database.prepare(`PRAGMA table_info(${table})`).all()
            .some((row: { name: string }) => row.name === column),
        ).toBe(true);
      }
    } finally {
      database.close();
    }
  });

  it("creates every required core table on an empty database", async () => {
    const database = new DatabaseSync(":memory:");
    try {
      installDatabase(database);
      const runMigrations = await loadMigrations();

      await runMigrations();

      const tables = new Set<string>(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all()
          .map((row: { name: string }) => row.name),
      );
      for (const table of REQUIRED_CORE_TABLES) {
        expect(tables.has(table)).toBe(true);
      }
      expect(database.prepare("PRAGMA user_version").get().user_version).toBe(10);
    } finally {
      database.close();
    }
  });

  it("upgrades a legacy database and preserves existing food logs", async () => {
    const database = new DatabaseSync(":memory:");
    try {
      // Representative pre-upgrade schema: core food tables exist, but the
      // additive columns and custom exercise table have not been introduced.
      database.exec(`
        CREATE TABLE food_logs (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          meal TEXT NOT NULL,
          name TEXT NOT NULL,
          quantity_g REAL,
          calories REAL NOT NULL,
          protein_g REAL NOT NULL,
          carbs_g REAL NOT NULL,
          fat_g REAL NOT NULL,
          source TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        INSERT INTO food_logs
          (id, date, meal, name, calories, protein_g, carbs_g, fat_g, source, created_at)
        VALUES ('kept-log', '2026-10-15', 'breakfast', 'Oats', 150, 5, 27, 3, 'manual', 123);
        CREATE TABLE daily_nutrition (
          date TEXT PRIMARY KEY,
          total_calories REAL NOT NULL,
          total_protein_g REAL NOT NULL,
          total_carbs_g REAL NOT NULL,
          total_fat_g REAL NOT NULL
        );
        INSERT INTO daily_nutrition
          (date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
        VALUES ('2026-10-15', 150, 5, 27, 3);
        CREATE TABLE workout_sessions (
          id TEXT PRIMARY KEY, date TEXT NOT NULL, day_type TEXT NOT NULL,
          started_at INTEGER, ended_at INTEGER, duration_min INTEGER,
          total_volume_kg REAL, notes TEXT, rpe INTEGER
        );
        INSERT INTO workout_sessions (id, date, day_type, started_at, ended_at)
        VALUES ('legacy-active', '2026-10-14', 'Push A', 1000, NULL);
        INSERT INTO workout_sessions (id, date, day_type, started_at, ended_at)
        VALUES ('legacy-finished', '2026-10-13', 'Pull A', 900, 1800);
        CREATE TABLE nutrition_target_history (
          id TEXT PRIMARY KEY,
          effective_date TEXT NOT NULL,
          calorie_target_kcal INTEGER NOT NULL,
          protein_target_g REAL NOT NULL,
          carbs_target_g REAL NOT NULL,
          fat_target_g REAL NOT NULL,
          source TEXT NOT NULL,
          maintenance_estimate_kcal INTEGER,
          algorithm_version INTEGER,
          explanation TEXT,
          created_at TEXT NOT NULL
        );
        INSERT INTO nutrition_target_history
          (id, effective_date, calorie_target_kcal, protein_target_g, carbs_target_g, fat_target_g, source, created_at)
        VALUES ('legacy-target', '2026-10-01', 2200, 130, 250, 70, 'manual', '2026-10-01T00:00:00.000Z');
        CREATE TABLE sync_state (
          source_app TEXT PRIMARY KEY, cursor TEXT, last_synced_at TEXT,
          last_success_at TEXT, last_error TEXT, updated_at TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);

      installDatabase(database);
      const runMigrations = await loadMigrations();
      await runMigrations();

      const log = database.prepare("SELECT id, name, calories FROM food_logs WHERE id = ?").get("kept-log");
      expect(log).toEqual({ id: "kept-log", name: "Oats", calories: 150 });
      expect(
        database.prepare("PRAGMA table_info(daily_nutrition)").all()
          .some((column: { name: string }) => column.name === "updated_at"),
      ).toBe(true);
      expect(database.prepare("PRAGMA table_info(daily_nutrition)").all()
        .some((column: { name: string }) => column.name === "is_complete")).toBe(true);
      expect(database.prepare("PRAGMA table_info(daily_nutrition)").all()
        .some((column: { name: string }) => column.name === "completed_at")).toBe(true);
      expect(database.prepare("PRAGMA table_info(sync_state)").all().some((column: { name: string }) => column.name === "owner_user_id")).toBe(true);
      expect(
        database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'custom_exercises'").get(),
      ).toBeDefined();
      expect(database.prepare("PRAGMA user_version").get().user_version).toBe(10);

      expect(database.prepare("SELECT status FROM workout_sessions WHERE id = ?").get("legacy-active").status).toBe("in_progress");
      expect(database.prepare("SELECT status FROM workout_sessions WHERE id = ?").get("legacy-finished").status).toBe("completed");

      // A second run must be safe and must not duplicate or remove saved data.
      await runMigrations();
      expect(database.prepare("SELECT COUNT(*) AS count FROM food_logs").get().count).toBe(1);
      expect(database.prepare("SELECT id, calorie_target_kcal FROM nutrition_target_history WHERE id = ?").get("legacy-target"))
        .toEqual({ id: "legacy-target", calorie_target_kcal: 2200 });
      expect(database.prepare("SELECT goal FROM nutrition_target_history WHERE id = ?").get("legacy-target").goal).toBeNull();
    } finally {
      database.close();
    }
  });

  it("does not downgrade a database created by a newer app version", async () => {
    const database = new DatabaseSync(":memory:");
    try {
      database.exec("PRAGMA user_version = 99;");
      installDatabase(database);
      const runMigrations = await loadMigrations();

      await expect(runMigrations()).rejects.toThrow(/newer than this app supports/);
      expect(database.prepare("PRAGMA user_version").get().user_version).toBe(99);
    } finally {
      database.close();
    }
  });
});
