CREATE TABLE `ai_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`context_snapshot` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `barcode_cache` (
	`barcode` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`source` text NOT NULL,
	`per100g_calories` real,
	`per100g_protein` real,
	`per100g_carbs` real,
	`per100g_fat` real,
	`per100g_fiber` real,
	`per100g_sugar` real,
	`per100g_sodium` real,
	`serving_size` real,
	`serving_unit` text,
	`data_quality` text,
	`warnings` text,
	`cached_at` integer NOT NULL,
	`last_used` integer
);
--> statement-breakpoint
CREATE TABLE `body_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`weight_kg` real,
	`body_fat_pct` real,
	`body_fat_mass_kg` real,
	`skeletal_muscle_mass_kg` real,
	`lean_body_mass_kg` real,
	`bmi` real,
	`inbody_score` integer,
	`tbw_l` real,
	`ecw_tbw_ratio` real,
	`visceral_fat_level` integer,
	`seg_muscle_right_arm` real,
	`seg_muscle_left_arm` real,
	`seg_muscle_trunk` real,
	`seg_muscle_right_leg` real,
	`seg_muscle_left_leg` real,
	`seg_fat_right_arm` real,
	`seg_fat_left_arm` real,
	`seg_fat_trunk` real,
	`seg_fat_right_leg` real,
	`seg_fat_left_leg` real,
	`raw_paste` text,
	`source` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `custom_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_name` text NOT NULL,
	`muscle_group` text,
	`equipment` text,
	`exercise_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_exercises_exercise_name_unique` ON `custom_exercises` (`exercise_name`);--> statement-breakpoint
CREATE TABLE `daily_nutrition` (
	`date` text PRIMARY KEY NOT NULL,
	`total_calories` real NOT NULL,
	`total_protein_g` real NOT NULL,
	`total_carbs_g` real NOT NULL,
	`total_fat_g` real NOT NULL,
	`protein_target_met` integer,
	`calorie_target_met` integer,
	`adherence_score` real,
	`notes` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `exercise_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`date` text NOT NULL,
	`exercise_name` text NOT NULL,
	`muscle_group` text,
	`equipment` text,
	`exercise_type` text,
	`order_in_session` integer,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`name` text NOT NULL,
	`quantity_g` real,
	`calories` real NOT NULL,
	`protein_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`fiber_g` real,
	`sugar_g` real,
	`sodium_mg` real,
	`source` text NOT NULL,
	`raw_input` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`generated_at` integer NOT NULL,
	`report_json` text NOT NULL,
	`pdf_path` text,
	`ai_summary` text,
	`key_wins` text,
	`key_adjustments` text
);
--> statement-breakpoint
CREATE TABLE `personal_foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text,
	`brand` text,
	`barcode` text,
	`per100g_calories` real,
	`per100g_protein` real,
	`per100g_carbs` real,
	`per100g_fat` real,
	`per100g_fiber` real,
	`per100g_sugar` real,
	`per100g_sodium` real,
	`serving_sizes` text,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`times_logged` integer DEFAULT 0 NOT NULL,
	`data_quality` text DEFAULT 'user_entered' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_foods_edit_history` (
	`id` text PRIMARY KEY NOT NULL,
	`food_id` text NOT NULL,
	`changed_at` text NOT NULL,
	`old_values` text NOT NULL,
	`new_values` text NOT NULL,
	`affected_log_count` integer,
	FOREIGN KEY (`food_id`) REFERENCES `personal_foods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`exercise_name` text PRIMARY KEY NOT NULL,
	`best_weight_kg` real NOT NULL,
	`best_reps_at_best_weight` integer,
	`best_1rm_estimated` real,
	`best_volume_single_set` real,
	`achieved_date` text NOT NULL,
	`previous_best_kg` real,
	`improvement_pct` real,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `quarterly_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`quarter` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`generated_at` integer NOT NULL,
	`ai_summary` text NOT NULL,
	`stats_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recovery_logs` (
	`date` text PRIMARY KEY NOT NULL,
	`sleep_duration_hr` real,
	`sleep_quality` integer,
	`bedtime` text,
	`wake_time` text,
	`hrv` integer,
	`resting_hr` integer,
	`energy_level` integer,
	`muscle_soreness` integer,
	`stress_level` integer,
	`notes` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_log_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`duration_sec` integer,
	`distance_km` real,
	`rpe` integer,
	`is_pr` integer,
	`is_warmup` integer,
	`notes` text,
	`logged_at` integer NOT NULL,
	FOREIGN KEY (`exercise_log_id`) REFERENCES `exercise_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplement_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`supplement_name` text NOT NULL,
	`taken` integer NOT NULL,
	`logged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`week_end` text NOT NULL,
	`generated_at` integer NOT NULL,
	`ai_summary` text NOT NULL,
	`stats_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`day_type` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`duration_min` integer,
	`total_volume_kg` real,
	`notes` text,
	`rpe` integer,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `yearly_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`year` text NOT NULL,
	`generated_at` integer NOT NULL,
	`ai_summary` text NOT NULL,
	`transformation_story` text,
	`stats_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`external_id` text,
	`deleted_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_tombstones_entity_type_entity_id_unique` ON `sync_tombstones` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`state` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_retry_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_queue_external_id_unique` ON `sync_queue` (`external_id`);
--> statement-breakpoint
CREATE INDEX `idx_sync_queue_state` ON `sync_queue` (`state`,`next_retry_at`);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`source_app` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_synced_at` text,
	`last_success_at` text,
	`last_error` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_profile` (
  `id` integer PRIMARY KEY NOT NULL,
  `calorie_target_kcal` integer NOT NULL,
  `protein_target_g` real NOT NULL,
  `carbs_target_g` real NOT NULL,
  `fat_target_g` real NOT NULL,
  `goal` text DEFAULT 'lose' NOT NULL,
  `target_mode` text DEFAULT 'manual' NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_target_history` (
  `id` text PRIMARY KEY NOT NULL,
  `effective_date` text NOT NULL,
  `calorie_target_kcal` integer NOT NULL,
  `protein_target_g` real NOT NULL,
  `carbs_target_g` real NOT NULL,
  `fat_target_g` real NOT NULL,
  `source` text NOT NULL,
  `maintenance_estimate_kcal` integer,
  `algorithm_version` integer,
  `explanation` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_nutrition_target_history_effective_date` ON `nutrition_target_history` (`effective_date`, `created_at`);
