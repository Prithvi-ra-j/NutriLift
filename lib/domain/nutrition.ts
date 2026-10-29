export type FoodLogPoint = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type NutritionTotals = FoodLogPoint;

export type NutritionTargets = {
  calories: number;
  protein_g: number;
};

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export function mealForHour(hour: number): MealType {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError("Hour must be an integer from 0 to 23.");
  }
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "snack";
  return "dinner";
}

export type FoodLogValidationPoint = Pick<
  FoodLogPoint,
  "calories" | "protein_g" | "carbs_g" | "fat_g"
> & {
  name: string;
};

export function createManualFoodDraft(name: string): FoodLogValidationPoint {
  return {
    name,
    calories: Number.NaN,
    protein_g: Number.NaN,
    carbs_g: Number.NaN,
    fat_g: Number.NaN,
  };
}

export function isValidFoodLog(log: FoodLogValidationPoint): boolean {
  return (
    log.name.trim().length > 0 &&
    Number.isFinite(log.calories) &&
    log.calories > 0 &&
    [log.protein_g, log.carbs_g, log.fat_g].every(
      (macro) => Number.isFinite(macro) && macro >= 0,
    )
  );
}

export function sumFoodLogs(logs: FoodLogPoint[]): NutritionTotals {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + log.calories,
      protein_g: totals.protein_g + log.protein_g,
      carbs_g: totals.carbs_g + log.carbs_g,
      fat_g: totals.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function adherenceScore(
  totals: Pick<NutritionTotals, "calories" | "protein_g">,
  targets: NutritionTargets,
  foodCount: number,
): number | null {
  if (foodCount < 2) return null;
  if (targets.calories <= 0 || targets.protein_g <= 0) {
    throw new RangeError("Nutrition targets must be greater than zero.");
  }

  const calorieCloseness = Math.max(
    0,
    1 - Math.abs(totals.calories - targets.calories) / targets.calories,
  );
  const proteinCoverage = Math.min(totals.protein_g / targets.protein_g, 1);
  // Sparse days have no score; otherwise calories contribute 60% and protein 40%.
  return 100 * (0.6 * calorieCloseness + 0.4 * proteinCoverage);
}
