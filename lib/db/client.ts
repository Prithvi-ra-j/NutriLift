import { Platform } from "react-native";
import * as schema from "./schema";
import { USER_PROFILE } from "../constants/user-profile";

// Platform-specific imports and initialization
let sqlite: any = null;
let db: any = null;

if (Platform.OS !== "web") {
  // Only import and initialize SQLite on native platforms
  const SQLite = require("expo-sqlite");
  const { drizzle } = require("drizzle-orm/expo-sqlite");
  
  // Preserve the established filename so existing installations retain local data.
  sqlite = SQLite.openDatabaseSync("apex.db");
  db = drizzle(sqlite, { schema });
} else {
  // Mock implementation for web
  console.warn("SQLite is not available on web. Database operations will be no-ops.");
  
  // Create a chainable mock that returns itself for all methods
  const createChainableMock = () => {
    const mock: any = new Proxy(() => Promise.resolve([]), {
      get: (target, prop) => {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return Promise.resolve([]).then.bind(Promise.resolve([]));
        }
        return createChainableMock();
      },
      apply: () => createChainableMock(),
    });
    return mock;
  };
  
  db = {
    select: createChainableMock,
    insert: createChainableMock,
    update: createChainableMock,
    delete: createChainableMock,
  };
}

export { db, sqlite };

// Run migrations — creates all tables if they don't exist
export async function runMigrations(): Promise<void> {
  if (Platform.OS === "web") {
    console.warn("Skipping migrations on web platform");
    return;
  }
  
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;


    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      age INTEGER,
      sex TEXT,
      height_cm REAL,
      calories_target REAL,
      protein_target_g REAL,
      carbs_target_g REAL,
      fat_target_g REAL,
      units TEXT NOT NULL DEFAULT 'metric',
      target_source TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity_g REAL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fiber_g REAL,
      sugar_g REAL,
      sodium_mg REAL,
      source TEXT NOT NULL,
      raw_input TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
    CREATE INDEX IF NOT EXISTS idx_food_logs_meal ON food_logs(meal);

    CREATE TABLE IF NOT EXISTS daily_nutrition (
      date TEXT PRIMARY KEY,
      total_calories REAL NOT NULL,
      total_protein_g REAL NOT NULL,
      total_carbs_g REAL NOT NULL,
      total_fat_g REAL NOT NULL,
      protein_target_met INTEGER,
      calorie_target_met INTEGER,
      adherence_score REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      day_type TEXT NOT NULL,
      started_at INTEGER,
      ended_at INTEGER,
      duration_min INTEGER,
      total_volume_kg REAL,
      notes TEXT,
      rpe INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);

    CREATE TABLE IF NOT EXISTS exercise_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES workout_sessions(id),
      date TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      muscle_group TEXT,
      equipment TEXT,
      order_in_session INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_logs_name ON exercise_logs(exercise_name);

    CREATE TABLE IF NOT EXISTS set_logs (
      id TEXT PRIMARY KEY,
      exercise_log_id TEXT NOT NULL REFERENCES exercise_logs(id),
      set_number INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      reps INTEGER NOT NULL,
      rpe INTEGER,
      is_pr INTEGER,
      is_warmup INTEGER,
      notes TEXT,
      logged_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_log_id);

    CREATE TABLE IF NOT EXISTS personal_records (
      exercise_name TEXT PRIMARY KEY,
      best_weight_kg REAL NOT NULL,
      best_reps_at_best_weight INTEGER,
      best_1rm_estimated REAL,
      best_volume_single_set REAL,
      achieved_date TEXT NOT NULL,
      previous_best_kg REAL,
      improvement_pct REAL
    );

    CREATE TABLE IF NOT EXISTS body_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      weight_kg REAL,
      body_fat_pct REAL,
      body_fat_mass_kg REAL,
      skeletal_muscle_mass_kg REAL,
      lean_body_mass_kg REAL,
      bmi REAL,
      inbody_score INTEGER,
      tbw_l REAL,
      ecw_tbw_ratio REAL,
      visceral_fat_level INTEGER,
      seg_muscle_right_arm REAL,
      seg_muscle_left_arm REAL,
      seg_muscle_trunk REAL,
      seg_muscle_right_leg REAL,
      seg_muscle_left_leg REAL,
      seg_fat_right_arm REAL,
      seg_fat_left_arm REAL,
      seg_fat_trunk REAL,
      seg_fat_right_leg REAL,
      seg_fat_left_leg REAL,
      raw_paste TEXT,
      source TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_body_stats_date ON body_stats(date);
    CREATE INDEX IF NOT EXISTS idx_body_stats_type ON body_stats(type);

    CREATE TABLE IF NOT EXISTS recovery_logs (
      date TEXT PRIMARY KEY,
      sleep_duration_hr REAL,
      sleep_quality INTEGER,
      bedtime TEXT,
      wake_time TEXT,
      hrv INTEGER,
      resting_hr INTEGER,
      energy_level INTEGER,
      muscle_soreness INTEGER,
      stress_level INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS supplement_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      supplement_name TEXT NOT NULL,
      taken INTEGER NOT NULL,
      logged_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date);

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      report_json TEXT NOT NULL,
      pdf_path TEXT,
      ai_summary TEXT,
      key_wins TEXT,
      key_adjustments TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context_snapshot TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at);

    CREATE TABLE IF NOT EXISTS barcode_cache (
      barcode TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      source TEXT NOT NULL,
      per100g_calories REAL,
      per100g_protein REAL,
      per100g_carbs REAL,
      per100g_fat REAL,
      per100g_fiber REAL,
      per100g_sugar REAL,
      per100g_sodium REAL,
      serving_size REAL,
      serving_unit TEXT,
      data_quality TEXT,
      warnings TEXT,
      cached_at INTEGER NOT NULL,
      last_used INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_barcode_cache_last_used ON barcode_cache(last_used);

    CREATE TABLE IF NOT EXISTS personal_foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      aliases TEXT,
      brand TEXT,
      barcode TEXT,
      per100g_calories REAL,
      per100g_protein REAL,
      per100g_carbs REAL,
      per100g_fat REAL,
      per100g_fiber REAL,
      per100g_sugar REAL,
      per100g_sodium REAL,
      serving_sizes TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      times_logged INTEGER NOT NULL DEFAULT 0,
      data_quality TEXT NOT NULL DEFAULT 'user_entered'
    );

    CREATE INDEX IF NOT EXISTS idx_personal_foods_name ON personal_foods(name);
    CREATE INDEX IF NOT EXISTS idx_personal_foods_barcode ON personal_foods(barcode);
    CREATE INDEX IF NOT EXISTS idx_personal_foods_times_logged ON personal_foods(times_logged);

    CREATE TABLE IF NOT EXISTS personal_foods_edit_history (
      id TEXT PRIMARY KEY,
      food_id TEXT NOT NULL REFERENCES personal_foods(id),
      changed_at TEXT NOT NULL,
      old_values TEXT NOT NULL,
      new_values TEXT NOT NULL,
      affected_log_count INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_personal_foods_edit_history_food_id ON personal_foods_edit_history(food_id);

    CREATE TABLE IF NOT EXISTS weekly_summaries (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      ai_summary TEXT NOT NULL,
      stats_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_summaries(week_start);

    CREATE TABLE IF NOT EXISTS quarterly_summaries (
      id TEXT PRIMARY KEY,
      quarter TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      ai_summary TEXT NOT NULL,
      stats_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quarterly_summaries_quarter ON quarterly_summaries(quarter);

    CREATE TABLE IF NOT EXISTS yearly_summaries (
      id TEXT PRIMARY KEY,
      year TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      ai_summary TEXT NOT NULL,
      transformation_story TEXT,
      stats_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_yearly_summaries_year ON yearly_summaries(year);
  `);

  // ─── Additive column migrations (safe to run on existing DBs) ───────────────
  // SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we
  // catch the "duplicate column" error and continue.
  const addColumnIfMissing = async (table: string, column: string, type: string) => {
    try {
      await sqlite.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    } catch {
      // Column already exists — ignore
    }
  };

  await addColumnIfMissing("set_logs", "duration_sec", "INTEGER");
  await addColumnIfMissing("set_logs", "distance_km", "REAL");
  await addColumnIfMissing("exercise_logs", "exercise_type", "TEXT");
  await addColumnIfMissing("daily_nutrition", "updated_at", "TEXT");
  await addColumnIfMissing("workout_sessions", "updated_at", "TEXT");
  await addColumnIfMissing("personal_records", "updated_at", "TEXT");
  await addColumnIfMissing("body_stats", "updated_at", "TEXT");
  await addColumnIfMissing("recovery_logs", "updated_at", "TEXT");
  await addColumnIfMissing("sync_tombstones", "external_id", "TEXT");

  const migrationTimestamp = new Date().toISOString();
  await sqlite.execAsync(`
    UPDATE daily_nutrition SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE workout_sessions SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE personal_records SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE body_stats SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE recovery_logs SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;

    CREATE TABLE IF NOT EXISTS sync_tombstones (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      external_id TEXT,
      deleted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      state TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_state ON sync_queue(state, next_retry_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      source_app TEXT PRIMARY KEY,
      cursor TEXT,
      last_synced_at TEXT,
      last_success_at TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  await sqlite.runAsync(
    `INSERT OR IGNORE INTO user_profile (id, display_name, age, sex, height_cm, calories_target, protein_target_g, carbs_target_g, fat_target_g, units, target_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'metric', 'migrated_default', ?, ?)`,
    ["default", USER_PROFILE.name, USER_PROFILE.age, USER_PROFILE.sex, USER_PROFILE.height_cm, USER_PROFILE.targets.calories, USER_PROFILE.targets.protein_g, USER_PROFILE.targets.carbs_g, USER_PROFILE.targets.fat_g, new Date().toISOString(), new Date().toISOString()]
  );
}
