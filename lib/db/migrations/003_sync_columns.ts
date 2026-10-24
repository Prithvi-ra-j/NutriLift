import { addColumn, type MigrationDatabase } from "./runner";

const syncedTables = [
  "food_logs",
  "set_logs",
  "exercise_logs",
  "workout_sessions",
  "body_stats",
  "daily_nutrition",
  "recovery_logs",
  "personal_records",
] as const;

export async function up(db: MigrationDatabase): Promise<void> {
  for (const table of ["food_logs", "exercise_logs", "set_logs", "personal_records"]) {
    await addColumn(db, table, "updated_at", "TEXT");
    await addColumn(db, table, "deleted_at", "TEXT");
  }

  for (const table of ["workout_sessions", "body_stats", "personal_foods"]) {
    await addColumn(db, table, "deleted_at", "TEXT");
  }

  await db.execAsync(`
    UPDATE food_logs
      SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, 'unixepoch')
      WHERE updated_at IS NULL;
    UPDATE set_logs
      SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', logged_at, 'unixepoch')
      WHERE updated_at IS NULL;
    UPDATE exercise_logs SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
    UPDATE workout_sessions SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
    UPDATE body_stats SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
    UPDATE daily_nutrition SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
    UPDATE recovery_logs SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
    UPDATE personal_records SET updated_at = achieved_date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
  `);

  for (const table of syncedTables) {
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_${table}_updated_at ON ${table}(updated_at);`,
    );
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_food_logs_date_alive
      ON food_logs(date) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_exercise_logs_session_alive
      ON exercise_logs(session_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_set_logs_exercise_alive
      ON set_logs(exercise_log_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_personal_records_alive
      ON personal_records(exercise_name) WHERE deleted_at IS NULL;
  `);
}
