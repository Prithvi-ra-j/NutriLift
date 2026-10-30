import { Platform } from "react-native";
import * as schema from "./schema";
import { ADDITIVE_COLUMN_MIGRATIONS, assertSupportedSchemaVersion, CURRENT_SCHEMA_VERSION, findMissingRequiredColumns, findMissingRequiredTables, REQUIRED_CORE_COLUMNS } from "./migration-contract";

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

  // Read the version before any DDL. A newer database must remain untouched.
  const versionRows = await sqlite.getAllAsync("PRAGMA user_version");
  const databaseVersion = Number(versionRows[0]?.user_version ?? 0);
  assertSupportedSchemaVersion(databaseVersion);

  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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
      provenance_type TEXT NOT NULL DEFAULT 'legacy_unknown',
      provenance_json TEXT,
      estimate_confidence REAL,
      estimate_reviewed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at TEXT
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
      notes TEXT,
      is_complete INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      exercise_name TEXT NOT NULL UNIQUE,
      muscle_group TEXT,
      equipment TEXT,
      exercise_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      day_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
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

  // Ensure the table exists before applying its additive column migration.
  await sqlite.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_tombstones (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      external_id TEXT,
      deleted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id)
    );

    CREATE TABLE IF NOT EXISTS recommendation_outcomes (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT NOT NULL,
      local_date TEXT NOT NULL,
      outcome TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(local_date, recommendation_id)
    );

    CREATE TABLE IF NOT EXISTS domain_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_version INTEGER NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      occurred_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      UNIQUE(entity_type, entity_id, entity_version)
    );
    CREATE INDEX IF NOT EXISTS idx_domain_events_type_time ON domain_events(event_type, occurred_at);

    CREATE TABLE IF NOT EXISTS derived_state_invalidations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES domain_events(id),
      projection_key TEXT NOT NULL,
      reason TEXT NOT NULL,
      invalidated_at TEXT NOT NULL,
      processed_at TEXT,
      UNIQUE(event_id, projection_key)
    );
    CREATE INDEX IF NOT EXISTS idx_derived_invalidations_pending ON derived_state_invalidations(processed_at, invalidated_at);

    CREATE TABLE IF NOT EXISTS app_telemetry_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      correlation_id TEXT,
      occurred_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_app_telemetry_type_time ON app_telemetry_events(event_type, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_app_telemetry_severity_time ON app_telemetry_events(severity, occurred_at);

    CREATE TABLE IF NOT EXISTS favorite_foods (
      id TEXT PRIMARY KEY,
      normalized_name TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      meal TEXT NOT NULL,
      quantity_g REAL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fiber_g REAL,
      sugar_g REAL,
      sodium_mg REAL,
      source TEXT NOT NULL,
      provenance_type TEXT NOT NULL DEFAULT 'legacy_unknown',
      provenance_json TEXT,
      estimate_confidence REAL,
      estimate_reviewed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_favorite_foods_name ON favorite_foods(name);

    CREATE TABLE IF NOT EXISTS repeatable_meals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      meal TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_repeatable_meals_name ON repeatable_meals(name);

    CREATE TABLE IF NOT EXISTS life_os_goal_progress (
      goal_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      current_value REAL,
      target_value REAL NOT NULL,
      progress_percent REAL,
      unit TEXT,
      as_of TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_life_os_goal_progress_status_updated ON life_os_goal_progress(status, updated_at);
  `);

  // ─── Additive column migrations (safe to run on existing DBs) ───────────────
  // Inspect table_info before ALTER instead of swallowing arbitrary SQLite errors.
  for (const migration of ADDITIVE_COLUMN_MIGRATIONS) {
    const columns = await sqlite.getAllAsync(`PRAGMA table_info(${migration.table})`);
    // Newer tables are created in later DDL below; skip their additive columns until they exist.
    if (columns.length === 0) continue;
    const hasColumn = columns.some(
      (column: { name: string }) => column.name === migration.column,
    );
    if (!hasColumn) {
      await sqlite.execAsync(
        `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type};`,
      );
    }
  }

  const migrationTimestamp = new Date().toISOString();
  await sqlite.execAsync(`
    UPDATE food_logs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, 'unixepoch') WHERE updated_at IS NULL;
    UPDATE daily_nutrition SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE workout_sessions SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE workout_sessions SET status = CASE WHEN ended_at IS NOT NULL THEN 'completed' WHEN started_at IS NOT NULL THEN 'in_progress' ELSE 'planned' END WHERE status IS NULL OR status = '';
    UPDATE personal_records SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE body_stats SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;
    UPDATE recovery_logs SET updated_at = '${migrationTimestamp}' WHERE updated_at IS NULL;

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
      owner_user_id TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Persist user-selected nutrition targets and preserve every effective-date change.
  await sqlite.execAsync(`
    CREATE TABLE IF NOT EXISTS nutrition_profile (
      id INTEGER PRIMARY KEY,
      calorie_target_kcal INTEGER NOT NULL,
      protein_target_g REAL NOT NULL,
      carbs_target_g REAL NOT NULL,
      fat_target_g REAL NOT NULL,
      goal TEXT NOT NULL DEFAULT 'lose',
      target_mode TEXT NOT NULL DEFAULT 'manual',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nutrition_target_history (
      id TEXT PRIMARY KEY,
      effective_date TEXT NOT NULL,
      calorie_target_kcal INTEGER NOT NULL,
      protein_target_g REAL NOT NULL,
      carbs_target_g REAL NOT NULL,
      fat_target_g REAL NOT NULL,
      source TEXT NOT NULL,
      goal TEXT,
      maintenance_estimate_kcal INTEGER,
      algorithm_version INTEGER,
      explanation TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nutrition_target_history_effective_date
      ON nutrition_target_history(effective_date, created_at);

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      age INTEGER,
      sex TEXT,
      height_cm REAL,
      training_start_date TEXT,
      current_split TEXT,
      training_phase TEXT,
      cardio TEXT,
      equipment TEXT,
      physique_goal TEXT,
      body_fat_goal_pct REAL,
      body_fat_goal_date TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Preserve an existing profile as the first known target version if history is empty.
  await sqlite.execAsync(`
    INSERT INTO nutrition_target_history (
      id, effective_date, calorie_target_kcal, protein_target_g, carbs_target_g,
      fat_target_g, source, goal, maintenance_estimate_kcal, algorithm_version,
      explanation, created_at
    )
    SELECT
      'migration:initial-target',
      COALESCE(date(updated_at), date('now', 'localtime')),
      calorie_target_kcal, protein_target_g, carbs_target_g, fat_target_g,
      'migration', goal, NULL, NULL,
      'Imported the previously saved nutrition target profile during schema migration.',
      updated_at
    FROM nutrition_profile
    WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM nutrition_target_history);
  `);
  // Additive profile goal fields keep upgrades safe for installs already at schema v14.
  // Existing profile values remain untouched; absent numeric goals remain unknown.
  // Fail fast on incomplete local schema instead of allowing screens to fail later.
  const rows = await sqlite.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'table'");
  const existingTables = new Set<string>(rows.map((row: { name: string }) => row.name));
  const missingTables = findMissingRequiredTables(existingTables);
  if (missingTables.length > 0) {
    throw new Error("Local database migration incomplete. Missing tables: " + missingTables.join(", "));
  }

  // Verify additive migrations too; a table can exist while still being too old
  // for the current Drizzle queries. All table names come from our static contract.
  const existingColumns: Record<string, Set<string>> = {};
  for (const table of Object.keys(REQUIRED_CORE_COLUMNS)) {
    const columns = await sqlite.getAllAsync(`PRAGMA table_info(${table})`);
    existingColumns[table] = new Set<string>(
      columns.map((column: { name: string }) => column.name),
    );
  }
  const missingColumns = findMissingRequiredColumns(existingColumns);
  if (missingColumns.length > 0) {
    throw new Error(
      "Local database migration incomplete. Missing columns: " + missingColumns.join(", "),
    );
  }

  // Do not certify a migrated schema while relational invariants are broken.
  // This is checked before advancing user_version so failed upgrades can be retried.
  const foreignKeyViolations = await sqlite.getAllAsync("PRAGMA foreign_key_check");
  if (foreignKeyViolations.length > 0) {
    throw new Error(
      "Local database migration found foreign-key violations: " +
      foreignKeyViolations.slice(0, 10).map((row: { table?: string; rowid?: number; parent?: string; fkid?: number }) =>
        `${row.table ?? "unknown"} row ${row.rowid ?? "unknown"} references ${row.parent ?? "unknown"} (constraint ${row.fkid ?? "unknown"})`,
      ).join("; "),
    );
  }

  // Mark the schema current only after every required table, column and foreign key passes.
  await sqlite.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
}
