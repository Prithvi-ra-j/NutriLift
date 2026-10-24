import { addColumn, type MigrationDatabase } from "./runner";

const EXERCISE_TYPES = new Set([
  "weight_reps",
  "bodyweight_reps",
  "reps_only",
  "duration",
  "distance_duration",
]);

export async function up(db: MigrationDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ exercise_type: string | null }>(
    "SELECT DISTINCT exercise_type FROM exercise_logs",
  );
  const unknown = rows
    .map((row) => row.exercise_type?.trim().toLowerCase())
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.length > 0 &&
        !EXERCISE_TYPES.has(value),
    );
  if (unknown.length > 0) {
    throw new Error(
      `Migration v5 found unsupported exercise types: ${[...new Set(unknown)].join(", ")}`,
    );
  }

  await addColumn(db, "personal_records", "estimated_1rm_kg", "REAL");
  await addColumn(db, "barcode_cache", "cache_status", "TEXT NOT NULL DEFAULT 'found'");
  await addColumn(db, "barcode_cache", "expires_at", "INTEGER");

  await db.execAsync(`
    UPDATE exercise_logs
    SET exercise_type = COALESCE(NULLIF(LOWER(TRIM(exercise_type)), ''), 'weight_reps');

    UPDATE set_logs
    SET reps = 0
    WHERE duration_sec IS NOT NULL
      AND exercise_log_id IN (
        SELECT id FROM exercise_logs WHERE exercise_type = 'duration'
      );

    UPDATE personal_records
    SET estimated_1rm_kg = best_1rm_estimated
    WHERE estimated_1rm_kg IS NULL;

    UPDATE barcode_cache SET cache_status = 'found' WHERE cache_status IS NULL;
    CREATE INDEX IF NOT EXISTS idx_barcode_cache_expiry ON barcode_cache(expires_at);
  `);
}
