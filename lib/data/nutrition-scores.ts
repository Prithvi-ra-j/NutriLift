/** Return a bounded 0–100 score for closeness to the daily calorie target. */
export function calculateCalorieAdherenceScore(totalCalories: number, targetCalories: number): number {
  if (!Number.isFinite(totalCalories) || !Number.isFinite(targetCalories) || targetCalories <= 0 || totalCalories < 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, 100 - (Math.abs(totalCalories - targetCalories) / targetCalories) * 100));
}
