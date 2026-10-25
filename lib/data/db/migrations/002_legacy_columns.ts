import { addColumn, type MigrationDatabase } from "./runner";

export async function up(db: MigrationDatabase): Promise<void> {
  await addColumn(db, "set_logs", "duration_sec", "INTEGER");
  await addColumn(db, "set_logs", "distance_km", "REAL");
  await addColumn(db, "exercise_logs", "exercise_type", "TEXT");
  await addColumn(db, "daily_nutrition", "updated_at", "TEXT");
  await addColumn(db, "workout_sessions", "updated_at", "TEXT");
  await addColumn(db, "personal_records", "updated_at", "TEXT");
  await addColumn(db, "body_stats", "updated_at", "TEXT");
  await addColumn(db, "recovery_logs", "updated_at", "TEXT");
  await addColumn(db, "sync_tombstones", "external_id", "TEXT");

  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_sync_tombstones_entity
      ON sync_tombstones(entity_type, entity_id);
  `);
}
