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
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(() => assertSupportedSchemaVersion(0)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(1)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(CURRENT_SCHEMA_VERSION)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(CURRENT_SCHEMA_VERSION + 1)).toThrow(/newer than this app supports/);
    expect(() => assertSupportedSchemaVersion(-1)).toThrow(/Invalid local database schema version/);
  });
  it("keeps additive migration declarations aligned with required column checks", () => {
    const declared = ADDITIVE_COLUMN_MIGRATIONS.map(({ table, column }) => `${table}.${column}`);
    const required = Object.entries(REQUIRED_CORE_COLUMNS).flatMap(([table, columns]) =>
      columns.filter((column) => !(table === "custom_exercises")).map((column) => `${table}.${column}`),
    );
    expect(declared.sort()).toEqual(required.sort());
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
      "daily_nutrition.updated_at",
      "workout_sessions.updated_at",
      "exercise_logs.exercise_type",
      "set_logs.distance_km",
      "personal_records.updated_at",
      "body_stats.updated_at",
      "recovery_logs.updated_at",
      "custom_exercises.exercise_type",
      "custom_exercises.created_at",
    ]);
  });
});
