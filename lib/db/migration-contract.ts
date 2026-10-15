/** Tables required for core local-first nutrition and workout flows. */
export const REQUIRED_CORE_TABLES = [
  "food_logs",
  "daily_nutrition",
  "workout_sessions",
  "exercise_logs",
  "set_logs",
  "custom_exercises",
] as const;

/** Return required tables that are absent from the SQLite catalog. */
export function findMissingRequiredTables(existingTables: ReadonlySet<string>): string[] {
  return REQUIRED_CORE_TABLES.filter((table) => !existingTables.has(table));
}
