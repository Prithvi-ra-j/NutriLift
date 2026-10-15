import { getLast30DaysNutrition } from "../db/queries/nutrition";
import { getNutritionTargets } from "../db/queries/nutrition-targets";
import { getWeightHistory } from "../db/queries/body";
import { estimateAdaptiveTarget, type AdaptiveTargetInput, type AdaptiveTargetResult, type CompleteIntakeDay, type WeightMeasurement } from "./adaptive-targets";
import type { DailyNutrition, BodyStat } from "../db/schema";
import type { NutritionTargets } from "./target-validation";

/** Build estimator input only from explicitly reviewed days and recorded weights. */
export function buildAdaptiveTargetInput(targets: NutritionTargets, intakeRows: DailyNutrition[], weightRows: BodyStat[]): AdaptiveTargetInput {
  const intakeDays: CompleteIntakeDay[] = intakeRows.map((day) => ({
    date: day.date,
    calories: day.total_calories,
    complete: day.is_complete === 1,
    quality: day.is_complete === 1 ? "reviewed" : "unresolved",
  }));
  const weights: WeightMeasurement[] = weightRows.flatMap((row) =>
    row.weight_kg != null && Number.isFinite(row.weight_kg) ? [{ date: row.date, weightKg: row.weight_kg }] : [],
  );
  return { intakeDays, weights, currentTargetKcal: targets.calories, goal: targets.goal };
}

export async function getAdaptiveTargetSuggestion(): Promise<AdaptiveTargetResult> {
  const [targets, intakeRows, weightRows] = await Promise.all([
    getNutritionTargets(),
    getLast30DaysNutrition(),
    getWeightHistory(30),
  ]);
  return estimateAdaptiveTarget(buildAdaptiveTargetInput(targets, intakeRows, weightRows));
}
