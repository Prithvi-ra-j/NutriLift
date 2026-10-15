/** Increment when a forward-compatible local SQLite schema migration is introduced. */
export const CURRENT_SCHEMA_VERSION = 2;

/** Reject a database written by a newer app version. */
export function assertSupportedSchemaVersion(databaseVersion: number): void {
  if (!Number.isInteger(databaseVersion) || databaseVersion < 0) {
    throw new Error(`Invalid local database schema version: ${databaseVersion}`);
  }
  if (databaseVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Local database schema version ${databaseVersion} is newer than this app supports (${CURRENT_SCHEMA_VERSION}). Update NutriLift before continuing.`,
    );
  }
}

/** Tables required for core local-first nutrition and workout flows. */
export const REQUIRED_CORE_TABLES = [
  "food_logs",
  "daily_nutrition",
  "workout_sessions",
  "exercise_logs",
  "set_logs",
  "custom_exercises",
] as const;

/**
 * Columns added after the original SQLite schema was shipped.
 * Keep this contract aligned with additive migrations in client.ts.
 */
export const REQUIRED_CORE_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  daily_nutrition: ["updated_at"],
  workout_sessions: ["updated_at"],
  exercise_logs: ["exercise_type"],
  set_logs: ["duration_sec", "distance_km"],
  personal_records: ["updated_at"],
  body_stats: ["updated_at"],
  recovery_logs: ["updated_at"],
  custom_exercises: ["exercise_type", "created_at"],
};

/** Return required tables that are absent from the SQLite catalog. */
export function findMissingRequiredTables(existingTables: ReadonlySet<string>): string[] {
  return REQUIRED_CORE_TABLES.filter((table) => !existingTables.has(table));
}

/** Return required columns absent from SQLite table_info results. */
export function findMissingRequiredColumns(
  existingColumns: Readonly<Record<string, ReadonlySet<string>>>,
): string[] {
  const missing: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_CORE_COLUMNS)) {
    for (const column of columns) {
      if (!existingColumns[table]?.has(column)) {
        missing.push(`${table}.${column}`);
      }
    }
  }
  return missing;
}
