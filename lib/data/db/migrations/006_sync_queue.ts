import { addColumn, type MigrationDatabase } from "./runner";

export async function up(db: MigrationDatabase): Promise<void> {
  await addColumn(db, "sync_queue", "lease_until", "TEXT");
  await addColumn(db, "sync_queue", "next_attempt_at", "TEXT");
  await addColumn(db, "supplement_logs", "updated_at", "TEXT");
  await addColumn(db, "supplement_logs", "deleted_at", "TEXT");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_checkpoint (
      source_table TEXT PRIMARY KEY NOT NULL,
      last_updated_at TEXT NOT NULL,
      last_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_uploaded_deletions (
      external_id TEXT PRIMARY KEY NOT NULL,
      uploaded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_claim
      ON sync_queue(state, next_attempt_at, created_at);

    UPDATE sync_queue
    SET next_attempt_at = next_retry_at
    WHERE next_attempt_at IS NULL AND next_retry_at IS NOT NULL;
  `);
  await db.execAsync(`
    UPDATE supplement_logs
    SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', logged_at, 'unixepoch')
    WHERE updated_at IS NULL;
  `);

  const cursorIndexes: Array<[string, string]> = [
    ["food_logs", "id"],
    ["supplement_logs", "id"],
    ["workout_sessions", "id"],
    ["exercise_logs", "id"],
    ["set_logs", "id"],
    ["personal_records", "exercise_name"],
    ["body_stats", "id"],
    ["daily_nutrition", "date"],
    ["recovery_logs", "date"],
  ];
  for (const [table, idColumn] of cursorIndexes) {
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_${table}_sync_cursor ON ${table}(updated_at, ${idColumn})`,
    );
  }
}
