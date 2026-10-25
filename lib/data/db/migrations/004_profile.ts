import { addColumn, type MigrationDatabase } from "./runner";

export async function up(db: MigrationDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY CHECK (id = 'me'),
      display_name TEXT,
      sex TEXT,
      birth_year INTEGER,
      height_cm REAL,
      goal_text TEXT,
      coach_notes TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS target_history (
      effective_from TEXT PRIMARY KEY,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await addColumn(db, "daily_nutrition", "targets_snapshot", "TEXT");
  await addColumn(
    db,
    "daily_nutrition",
    "food_count",
    "INTEGER NOT NULL DEFAULT 0",
  );
}
