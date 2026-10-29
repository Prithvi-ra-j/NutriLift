export const MIN_CALORIE_FLOOR = 1500;

export type NutritionTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function clampWeeklyChange(value: number, current: number): number {
  const clamped = Math.max(current * 0.9, Math.min(current * 1.1, value));
  return Math.round(clamped * 100) / 100;
}

export function clampTargets(
  suggested: NutritionTargets,
  current: NutritionTargets,
  minimumCalories = MIN_CALORIE_FLOOR,
): NutritionTargets {
  if (!Number.isFinite(minimumCalories) || minimumCalories < MIN_CALORIE_FLOOR) {
    throw new RangeError(`The minimum calorie floor cannot be below ${MIN_CALORIE_FLOOR}.`);
  }
  for (const value of Object.values(suggested)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Suggested nutrition targets must be finite and non-negative.");
    }
  }
  for (const value of Object.values(current)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("Current nutrition targets must be finite and positive.");
    }
  }

  return {
    calories: Math.max(
      minimumCalories,
      clampWeeklyChange(suggested.calories, current.calories),
    ),
    protein_g: clampWeeklyChange(suggested.protein_g, current.protein_g),
    carbs_g: clampWeeklyChange(suggested.carbs_g, current.carbs_g),
    fat_g: clampWeeklyChange(suggested.fat_g, current.fat_g),
  };
}

export function applyCoachGuardrails(
  text: string,
  minimumCalories = MIN_CALORIE_FLOOR,
): string {
  const calorieFigures = text.matchAll(/\b(\d{1,2}(?:,\d{3})|\d{3,4}(?:\.\d+)?)\s*(?:kcal|calories)\b/gi);
  for (const match of calorieFigures) {
    const figure = match[1];
    if (figure === undefined) continue;
    const calories = Number(figure.replaceAll(",", ""));
    if (calories < minimumCalories) {
      return `${text}\n\nPlease discuss calorie targets with a qualified professional; NutriLift does not recommend targets below your configured floor.`;
    }
  }
  return text;
}
