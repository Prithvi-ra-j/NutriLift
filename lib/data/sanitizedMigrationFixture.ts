export type MigrationFixtureSources = {
  foodLog: boolean;
  dailyNutrition: boolean;
  workoutSession: boolean;
  exerciseLog: boolean;
  setLog: boolean;
  recoveryLog: boolean;
  personalRecord: boolean;
};

export function buildSanitizedV0Fixture(sources: MigrationFixtureSources): string {
  if (!Object.values(sources).some(Boolean)) {
    throw new Error("There is no local log data to build a migration fixture from.");
  }

  const statements: string[] = ["DROP TABLE IF EXISTS custom_exercises;"];

  if (sources.foodLog) {
    statements.push(`INSERT INTO food_logs
      (id, date, meal, name, calories, protein_g, carbs_g, fat_g, source, created_at)
      VALUES ('fixture-food-1', '2025-01-02', 'breakfast', 'Fixture Food', 100, 8, 1, 7, 'manual', 1735778400);`);
  }

  if (sources.dailyNutrition) {
    statements.push(`INSERT INTO daily_nutrition
      (date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
      VALUES ('2025-01-02', 100, 8, 1, 7);`);
  }

  if (sources.workoutSession) {
    statements.push(`INSERT INTO workout_sessions (id, date, day_type)
      VALUES ('fixture-session-1', '2025-01-02', 'Push A');`);
  }

  if (sources.exerciseLog && sources.workoutSession) {
    statements.push(`INSERT INTO exercise_logs (id, session_id, date, exercise_name)
      VALUES ('fixture-exercise-1', 'fixture-session-1', '2025-01-02', 'Fixture Exercise');`);
  }

  if (sources.setLog && sources.exerciseLog && sources.workoutSession) {
    statements.push(`INSERT INTO set_logs (id, exercise_log_id, set_number, weight_kg, reps, logged_at)
      VALUES ('fixture-set-1', 'fixture-exercise-1', 1, 50, 8, 1735778400);`);
  }

  if (sources.recoveryLog) {
    statements.push(`INSERT INTO recovery_logs (date, sleep_quality)
      VALUES ('2025-01-02', 4);`);
  }

  if (sources.personalRecord) {
    statements.push(`INSERT INTO personal_records
      (exercise_name, best_weight_kg, best_1rm_estimated, achieved_date)
      VALUES ('Fixture Exercise', 50, 66.6, '2025-01-02');`);
  }

  return `PRAGMA user_version = 0;\n\n${statements.join("\n\n")}\n`;
}
