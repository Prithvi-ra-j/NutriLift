import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// ─── Food Logs ────────────────────────────────────────────────────────────────
export const foodLogs = sqliteTable("food_logs", {
  id: text("id").primaryKey(), // UUID
  date: text("date").notNull(), // YYYY-MM-DD
  meal: text("meal").notNull(), // breakfast | lunch | snack | dinner
  name: text("name").notNull(),
  quantity_g: real("quantity_g"),
  calories: real("calories").notNull(),
  protein_g: real("protein_g").notNull(),
  carbs_g: real("carbs_g").notNull(),
  fat_g: real("fat_g").notNull(),
  fiber_g: real("fiber_g"),
  sugar_g: real("sugar_g"),
  sodium_mg: real("sodium_mg"),
  source: text("source").notNull(), // 'manual' | 'voice' | 'paste'
  raw_input: text("raw_input"), // original text that was parsed
  created_at: integer("created_at").notNull(), // unix timestamp
});

// ─── Daily Nutrition Summary ──────────────────────────────────────────────────
export const dailyNutrition = sqliteTable("daily_nutrition", {
  date: text("date").primaryKey(),
  total_calories: real("total_calories").notNull(),
  total_protein_g: real("total_protein_g").notNull(),
  total_carbs_g: real("total_carbs_g").notNull(),
  total_fat_g: real("total_fat_g").notNull(),
  protein_target_met: integer("protein_target_met"), // boolean
  calorie_target_met: integer("calorie_target_met"),
  adherence_score: real("adherence_score"), // 0-100
  notes: text("notes"),
});

// ─── Workout Sessions ─────────────────────────────────────────────────────────
export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  day_type: text("day_type").notNull(), // Push A | Pull A | Legs A | Push B | Pull B | Legs B | Rest
  started_at: integer("started_at"),
  ended_at: integer("ended_at"),
  duration_min: integer("duration_min"),
  total_volume_kg: real("total_volume_kg"),
  notes: text("notes"),
  rpe: integer("rpe"), // 1-10 rate of perceived exertion
});

// ─── Exercise Logs ────────────────────────────────────────────────────────────
export const exerciseLogs = sqliteTable("exercise_logs", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => workoutSessions.id),
  date: text("date").notNull(),
  exercise_name: text("exercise_name").notNull(),
  muscle_group: text("muscle_group"), // chest | back | shoulders | biceps | triceps | quads | hamstrings | glutes | core
  equipment: text("equipment"), // machine | barbell | dumbbell | cable | bodyweight
  order_in_session: integer("order_in_session"),
});

// ─── Set Logs ─────────────────────────────────────────────────────────────────
export const setLogs = sqliteTable("set_logs", {
  id: text("id").primaryKey(),
  exercise_log_id: text("exercise_log_id")
    .notNull()
    .references(() => exerciseLogs.id),
  set_number: integer("set_number").notNull(),
  weight_kg: real("weight_kg").notNull(),
  reps: integer("reps").notNull(),
  rpe: integer("rpe"), // set-level RPE
  is_pr: integer("is_pr"), // boolean — auto-detected
  is_warmup: integer("is_warmup"),
  notes: text("notes"),
  logged_at: integer("logged_at").notNull(),
});

// ─── Personal Records ─────────────────────────────────────────────────────────
export const personalRecords = sqliteTable("personal_records", {
  exercise_name: text("exercise_name").primaryKey(),
  best_weight_kg: real("best_weight_kg").notNull(),
  best_reps_at_best_weight: integer("best_reps_at_best_weight"),
  best_1rm_estimated: real("best_1rm_estimated"), // Epley formula
  best_volume_single_set: real("best_volume_single_set"), // weight × reps
  achieved_date: text("achieved_date").notNull(),
  previous_best_kg: real("previous_best_kg"),
  improvement_pct: real("improvement_pct"),
});

// ─── Body Stats ───────────────────────────────────────────────────────────────
export const bodyStats = sqliteTable("body_stats", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(), // 'weight' | 'inbody'
  weight_kg: real("weight_kg"),
  // InBody fields (null for type='weight')
  body_fat_pct: real("body_fat_pct"),
  body_fat_mass_kg: real("body_fat_mass_kg"),
  skeletal_muscle_mass_kg: real("skeletal_muscle_mass_kg"),
  lean_body_mass_kg: real("lean_body_mass_kg"),
  bmi: real("bmi"),
  inbody_score: integer("inbody_score"),
  tbw_l: real("tbw_l"), // total body water
  ecw_tbw_ratio: real("ecw_tbw_ratio"), // hydration/inflammation marker
  visceral_fat_level: integer("visceral_fat_level"),
  // Segmental muscle (kg per limb)
  seg_muscle_right_arm: real("seg_muscle_right_arm"),
  seg_muscle_left_arm: real("seg_muscle_left_arm"),
  seg_muscle_trunk: real("seg_muscle_trunk"),
  seg_muscle_right_leg: real("seg_muscle_right_leg"),
  seg_muscle_left_leg: real("seg_muscle_left_leg"),
  // Segmental fat
  seg_fat_right_arm: real("seg_fat_right_arm"),
  seg_fat_left_arm: real("seg_fat_left_arm"),
  seg_fat_trunk: real("seg_fat_trunk"),
  seg_fat_right_leg: real("seg_fat_right_leg"),
  seg_fat_left_leg: real("seg_fat_left_leg"),
  raw_paste: text("raw_paste"), // original pasted InBody text
  source: text("source"), // 'manual' | 'inbody_paste'
});

// ─── Recovery Logs ────────────────────────────────────────────────────────────
export const recoveryLogs = sqliteTable("recovery_logs", {
  date: text("date").primaryKey(),
  sleep_duration_hr: real("sleep_duration_hr"),
  sleep_quality: integer("sleep_quality"), // 1-5 subjective
  bedtime: text("bedtime"), // HH:MM
  wake_time: text("wake_time"),
  hrv: integer("hrv"), // if user has wearable
  resting_hr: integer("resting_hr"),
  energy_level: integer("energy_level"), // 1-5
  muscle_soreness: integer("muscle_soreness"), // 1-5
  stress_level: integer("stress_level"), // 1-5
  notes: text("notes"),
});

// ─── Supplement Logs ──────────────────────────────────────────────────────────
export const supplementLogs = sqliteTable("supplement_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  supplement_name: text("supplement_name").notNull(),
  taken: integer("taken").notNull(), // boolean
  logged_at: integer("logged_at").notNull(),
});

// ─── Monthly Reports ──────────────────────────────────────────────────────────
export const monthlyReports = sqliteTable("monthly_reports", {
  id: text("id").primaryKey(),
  month: text("month").notNull(), // YYYY-MM
  generated_at: integer("generated_at").notNull(),
  report_json: text("report_json").notNull(), // full structured report
  pdf_path: text("pdf_path"), // local file path
  ai_summary: text("ai_summary"), // LLM-generated narrative (3-4 paragraphs)
  key_wins: text("key_wins"), // JSON array of strings
  key_adjustments: text("key_adjustments"), // JSON array of recommended changes
});

// ─── Weekly Summaries ─────────────────────────────────────────────────────────
export const weeklySummaries = sqliteTable("weekly_summaries", {
  id: text("id").primaryKey(),
  week_start: text("week_start").notNull(), // YYYY-MM-DD (Sunday)
  week_end: text("week_end").notNull(), // YYYY-MM-DD (Saturday)
  generated_at: integer("generated_at").notNull(),
  ai_summary: text("ai_summary").notNull(), // LLM-generated narrative summary (3-4 sentences)
  // Raw stats for reference
  stats_json: text("stats_json").notNull(), // JSON of weekly stats
});

// ─── Quarterly Summaries ──────────────────────────────────────────────────────
export const quarterlySummaries = sqliteTable("quarterly_summaries", {
  id: text("id").primaryKey(),
  quarter: text("quarter").notNull(), // YYYY-Q1, YYYY-Q2, etc.
  start_date: text("start_date").notNull(), // YYYY-MM-DD
  end_date: text("end_date").notNull(), // YYYY-MM-DD
  generated_at: integer("generated_at").notNull(),
  ai_summary: text("ai_summary").notNull(), // LLM-generated narrative (4-5 paragraphs)
  // Aggregated from monthly reports
  stats_json: text("stats_json").notNull(),
});

// ─── Yearly Summaries ─────────────────────────────────────────────────────────
export const yearlySummaries = sqliteTable("yearly_summaries", {
  id: text("id").primaryKey(),
  year: text("year").notNull(), // YYYY
  generated_at: integer("generated_at").notNull(),
  ai_summary: text("ai_summary").notNull(), // LLM-generated narrative (5-6 paragraphs)
  transformation_story: text("transformation_story"), // Year-long journey narrative
  // Aggregated from quarterly summaries
  stats_json: text("stats_json").notNull(),
});

// ─── AI Conversations ─────────────────────────────────────────────────────────
export const aiConversations = sqliteTable("ai_conversations", {
  id: text("id").primaryKey(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  context_snapshot: text("context_snapshot"), // JSON of what data was sent
  created_at: integer("created_at").notNull(),
});

// ─── Barcode Cache ────────────────────────────────────────────────────────────
export const barcodeCache = sqliteTable("barcode_cache", {
  barcode: text("barcode").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  source: text("source").notNull(), // 'openfoodfacts' | 'nutritionix'
  per100g_calories: real("per100g_calories"),
  per100g_protein: real("per100g_protein"),
  per100g_carbs: real("per100g_carbs"),
  per100g_fat: real("per100g_fat"),
  per100g_fiber: real("per100g_fiber"),
  per100g_sugar: real("per100g_sugar"),
  per100g_sodium: real("per100g_sodium"),
  serving_size: real("serving_size"),
  serving_unit: text("serving_unit"),
  data_quality: text("data_quality"), // 'verified' | 'partial' | 'suspect' | 'poor'
  warnings: text("warnings"), // JSON array of warning strings
  cached_at: integer("cached_at").notNull(),
  last_used: integer("last_used"),
});

// ─── Personal Foods ───────────────────────────────────────────────────────────
export const personalFoods = sqliteTable("personal_foods", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  aliases: text("aliases"), // JSON array
  brand: text("brand"),
  barcode: text("barcode"),
  per100g_calories: real("per100g_calories"),
  per100g_protein: real("per100g_protein"),
  per100g_carbs: real("per100g_carbs"),
  per100g_fat: real("per100g_fat"),
  per100g_fiber: real("per100g_fiber"),
  per100g_sugar: real("per100g_sugar"),
  per100g_sodium: real("per100g_sodium"),
  serving_sizes: text("serving_sizes"), // JSON array of {label, grams}
  source: text("source").notNull(), // 'manual' | 'barcode_edited' | 'indian_db_edited'
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  times_logged: integer("times_logged").notNull().default(0),
  data_quality: text("data_quality").notNull().default("user_entered"),
});

// ─── Personal Foods Edit History ──────────────────────────────────────────────
export const personalFoodsEditHistory = sqliteTable("personal_foods_edit_history", {
  id: text("id").primaryKey(),
  food_id: text("food_id")
    .notNull()
    .references(() => personalFoods.id),
  changed_at: text("changed_at").notNull(),
  old_values: text("old_values").notNull(), // JSON snapshot
  new_values: text("new_values").notNull(), // JSON snapshot
  affected_log_count: integer("affected_log_count"),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewFoodLog = typeof foodLogs.$inferInsert;

export type DailyNutrition = typeof dailyNutrition.$inferSelect;
export type NewDailyNutrition = typeof dailyNutrition.$inferInsert;

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type NewExerciseLog = typeof exerciseLogs.$inferInsert;

export type SetLog = typeof setLogs.$inferSelect;
export type NewSetLog = typeof setLogs.$inferInsert;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;

export type BodyStat = typeof bodyStats.$inferSelect;
export type NewBodyStat = typeof bodyStats.$inferInsert;

export type RecoveryLog = typeof recoveryLogs.$inferSelect;
export type NewRecoveryLog = typeof recoveryLogs.$inferInsert;

export type SupplementLog = typeof supplementLogs.$inferSelect;
export type NewSupplementLog = typeof supplementLogs.$inferInsert;

export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type NewMonthlyReport = typeof monthlyReports.$inferInsert;

export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type NewWeeklySummary = typeof weeklySummaries.$inferInsert;

export type QuarterlySummary = typeof quarterlySummaries.$inferSelect;
export type NewQuarterlySummary = typeof quarterlySummaries.$inferInsert;

export type YearlySummary = typeof yearlySummaries.$inferSelect;
export type NewYearlySummary = typeof yearlySummaries.$inferInsert;

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;

export type BarcodeCache = typeof barcodeCache.$inferSelect;
export type NewBarcodeCache = typeof barcodeCache.$inferInsert;

export type PersonalFood = typeof personalFoods.$inferSelect;
export type NewPersonalFood = typeof personalFoods.$inferInsert;

export type PersonalFoodEditHistory = typeof personalFoodsEditHistory.$inferSelect;
export type NewPersonalFoodEditHistory = typeof personalFoodsEditHistory.$inferInsert;
