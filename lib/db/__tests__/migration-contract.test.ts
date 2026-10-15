import {
  ADDITIVE_COLUMN_MIGRATIONS,
  assertSupportedSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  findMissingRequiredColumns,
  findMissingRequiredTables,
  REQUIRED_CORE_COLUMNS,
  REQUIRED_CORE_TABLES,
} from "../migration-contract";

describe("local database migration contract", () => {
  it("supports legacy and current schema versions but rejects future versions", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(11);
    expect(() => assertSupportedSchemaVersion(0)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(1)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(CURRENT_SCHEMA_VERSION + 1)).toThrow(/newer than this app supports/);
    expect(() => assertSupportedSchemaVersion(-1)).toThrow(/Invalid local database schema version/);
  });
  it("keeps additive migration declarations aligned with required column checks", () => {
    const declared = ADDITIVE_COLUMN_MIGRATIONS.map(({ table, column }) => `${table}.${column}`);
    const required = Object.entries(REQUIRED_CORE_COLUMNS).flatMap(([table, columns]) =>
      columns.filter((column) => !(table === "custom_exercises" && (column === "exercise_type" || column === "created_at"))).map((column) => `${table}.${column}`),
    );
    expect(declared.sort()).toEqual(required.sort());
  });


  it("keeps the clean-install Drizzle SQL snapshot aligned with runtime-only schema fields", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const migrationSql = readFileSync(
      join(__dirname, "../../../drizzle/0000_wakeful_supernaut.sql"),
      "utf8",
    );
    for (const table of ["sync_tombstones", "sync_queue", "sync_state", "recommendation_outcomes", "domain_events", "derived_state_invalidations", "app_telemetry_events", "favorite_foods", "repeatable_meals"]) {
      expect(migrationSql).toContain(`CREATE TABLE \`${table}\``);
    }
    expect(migrationSql).toContain("`updated_at` text");
    expect(migrationSql).toContain("`external_id` text");
    expect(migrationSql).toContain("`goal` text");
    expect(migrationSql).toContain("`is_complete` integer DEFAULT 0 NOT NULL");
    expect(migrationSql).toContain("`completed_at` text");
    expect(migrationSql).toContain("`owner_user_id` text");
    expect(migrationSql).toContain("provenance_type");
    expect(migrationSql).toContain("provenance_json");
    expect(migrationSql).toContain("estimate_confidence");
    expect(migrationSql).toContain("estimate_reviewed");
    expect(migrationSql).toContain("`idx_recommendation_outcomes_date_id`");
  });

  it("accepts a database containing every required core table", () => {
    expect(findMissingRequiredTables(new Set(REQUIRED_CORE_TABLES))).toEqual([]);
  });

  it("identifies missing core tables, including custom exercises", () => {
    const existing = new Set(REQUIRED_CORE_TABLES.filter((table) => table !== "custom_exercises"));
    expect(findMissingRequiredTables(existing)).toEqual(["custom_exercises"]);
  });

  it("reports all missing required tables in stable order", () => {
    expect(findMissingRequiredTables(new Set())).toEqual([...REQUIRED_CORE_TABLES]);
  });

  it("accepts every required additive column when present", () => {
    const existingColumns = Object.fromEntries(
      Object.entries(REQUIRED_CORE_COLUMNS).map(([table, columns]) => [table, new Set(columns)]),
    );
    expect(findMissingRequiredColumns(existingColumns)).toEqual([]);
  });

  it("reports missing additive columns with table-qualified names", () => {
    expect(
      findMissingRequiredColumns({
        set_logs: new Set(["duration_sec"]),
        exercise_logs: new Set(),
      }),
    ).toEqual([
      "food_logs.provenance_type",
      "food_logs.provenance_json",
      "food_logs.estimate_confidence",
      "food_logs.estimate_reviewed",
      "daily_nutrition.updated_at",
      "daily_nutrition.is_complete",
      "daily_nutrition.completed_at",
      "workout_sessions.updated_at",
      "workout_sessions.status",
      "exercise_logs.exercise_type",
      "set_logs.distance_km",
      "personal_records.updated_at",
      "body_stats.updated_at",
      "recovery_logs.updated_at",
      "sync_tombstones.external_id",
      "nutrition_target_history.goal",
      "sync_state.owner_user_id",
      "custom_exercises.exercise_type",
      "custom_exercises.created_at",
    ]);
  });
});
