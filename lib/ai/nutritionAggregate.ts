import type { DailyNutrition } from "../db/schema";
import { isTrackingPausedOnDate } from "../pauseMode";

type NutritionRow = Pick<
  DailyNutrition,
  | "date"
  | "food_count"
  | "total_calories"
  | "total_protein_g"
  | "calorie_target_met"
  | "protein_target_met"
>;

export type NutritionAggregate = {
  days_logged: number;
  average_calories: number;
  average_protein_g: number;
  calorie_adherence_pct: number | null;
  protein_hit_rate_pct: number | null;
};

function average(values: number[]): number | null {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function percentage(values: Array<number | null>): number | null {
  const measured = values.filter((value): value is number => value !== null);
  const result = average(measured);
  return result === null ? null : Math.round(result * 100);
}

export function summarizeNutrition(
  rows: NutritionRow[],
  pauseFrom: string | null,
  pauseUntil: string | null,
): NutritionAggregate {
  const eligibleRows = rows.filter((day) =>
    day.food_count > 0 && !isTrackingPausedOnDate(day.date, pauseFrom, pauseUntil),
  );
  const calories = average(eligibleRows.map((day) => day.total_calories));
  const protein = average(eligibleRows.map((day) => day.total_protein_g));

  return {
    days_logged: eligibleRows.length,
    average_calories: Math.round(calories ?? 0),
    average_protein_g: Math.round(protein ?? 0),
    calorie_adherence_pct: percentage(eligibleRows.map((day) => day.calorie_target_met)),
    protein_hit_rate_pct: percentage(eligibleRows.map((day) => day.protein_target_met)),
  };
}
