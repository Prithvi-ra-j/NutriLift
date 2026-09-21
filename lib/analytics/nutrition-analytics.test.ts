import { computeNutritionSummary } from "./nutrition-analytics";
import type { DailyNutrition } from "../db/schema";

function day(date: string, protein: number, calories = 2000): DailyNutrition {
  return {
    date,
    total_calories: calories,
    total_protein_g: protein,
    total_carbs_g: 200,
    total_fat_g: 60,
    protein_target_met: protein >= 150 ? 1 : 0,
    calorie_target_met: calories >= 1800 && calories <= 2200 ? 1 : 0,
    adherence_score: null,
    notes: null,
    updated_at: null,
  };
}

describe("nutrition analytics", () => {
  it("computes averages and hit rates", () => {
    const summary = computeNutritionSummary([
      day("2026-09-20", 160, 2000),
      day("2026-09-21", 140, 2500),
    ], 150);

    expect(summary.avgDailyProtein).toBe(150);
    expect(summary.avgDailyCalories).toBe(2250);
    expect(summary.proteinHitRate).toBe(50);
    expect(summary.calorieHitRate).toBe(50);
  });

  it("does not invent a protein gap when target is missing", () => {
    const summary = computeNutritionSummary([day("2026-09-21", 120)], null);
    expect(summary.proteinGapAnalysis).toBe("Set a protein target to see gap analysis.");
  });
});
