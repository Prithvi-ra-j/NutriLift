import { calculateCalorieAdherenceScore } from "../data/nutrition-scores";

import { USER_PROFILE } from "../constants/user-profile";

export type NutritionGoal = "lose" | "maintain" | "gain";
export type NutritionTargetMode = "manual" | "adaptive";

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: NutritionGoal;
  mode: NutritionTargetMode;
}

/** Safe baseline shared by persistence and pure validation tests. */
export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: USER_PROFILE.targets.calories,
  protein_g: USER_PROFILE.targets.protein_g,
  carbs_g: USER_PROFILE.targets.carbs_g,
  fat_g: USER_PROFILE.targets.fat_g,
  goal: "lose",
  mode: "manual",
};

export interface TargetComparison {
  protein_target_met: 0 | 1;
  calorie_target_met: 0 | 1;
  adherence_score: number;
}

/** Recompute target-derived fields without changing actual logged intake. */
export function calculateTargetComparison(
  totals: { total_calories: number; total_protein_g: number },
  targets: NutritionTargets,
): TargetComparison {
  validateNutritionTargets(targets);
  if (
    !Number.isFinite(totals.total_calories) || totals.total_calories < 0 ||
    !Number.isFinite(totals.total_protein_g) || totals.total_protein_g < 0
  ) {
    throw new Error("Nutrition totals must be finite, non-negative values.");
  }
  const proteinTargetMet: 0 | 1 = totals.total_protein_g >= targets.protein_g ? 1 : 0;
  const calorieTargetMet: 0 | 1 =
    totals.total_calories >= targets.calories * 0.9 &&
    totals.total_calories <= targets.calories * 1.1 ? 1 : 0;
  const proteinScore = Math.min(100, (totals.total_protein_g / targets.protein_g) * 100);
  const calorieScore = calculateCalorieAdherenceScore(totals.total_calories, targets.calories);
  return {
    protein_target_met: proteinTargetMet,
    calorie_target_met: calorieTargetMet,
    adherence_score: proteinScore * 0.6 + calorieScore * 0.4,
  };
}

export function validateNutritionTargets(targets: NutritionTargets): void {
  if (!Number.isInteger(targets.calories) || targets.calories < 1200 || targets.calories > 6000) {
    throw new Error("Calories must be a whole number between 1200 and 6000 kcal.");
  }
  if (!Number.isFinite(targets.protein_g) || targets.protein_g < 20 || targets.protein_g > 400) {
    throw new Error("Protein must be between 20 and 400 g.");
  }
  if (!Number.isFinite(targets.carbs_g) || targets.carbs_g < 0 || targets.carbs_g > 800) {
    throw new Error("Carbohydrates must be between 0 and 800 g.");
  }
  if (!Number.isFinite(targets.fat_g) || targets.fat_g < 0 || targets.fat_g > 300) {
    throw new Error("Fat must be between 0 and 300 g.");
  }
  if (!["lose", "maintain", "gain"].includes(targets.goal)) {
    throw new Error("Choose a supported goal: lose, maintain, or gain.");
  }
  if (!["manual", "adaptive"].includes(targets.mode)) {
    throw new Error("Choose manual or adaptive target mode.");
  }
}
