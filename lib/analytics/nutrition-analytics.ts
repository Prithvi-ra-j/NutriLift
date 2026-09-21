import type { DailyNutrition, FoodLog } from "../db/schema";

export interface NutritionSummary {
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  proteinHitRate: number;
  calorieHitRate: number;
  bestStreak: number;
  currentStreak: number;
  worstDay: string | null;
  bestDay: string | null;
  proteinGapAnalysis: string;
}

export function computeNutritionSummary(days: DailyNutrition[], proteinTarget?: number | null): NutritionSummary {
  if (days.length === 0) {
    return {
      avgDailyCalories: 0,
      avgDailyProtein: 0,
      avgDailyCarbs: 0,
      avgDailyFat: 0,
      proteinHitRate: 0,
      calorieHitRate: 0,
      bestStreak: 0,
      currentStreak: 0,
      worstDay: null,
      bestDay: null,
      proteinGapAnalysis: "No data logged yet.",
    };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avgCalories = avg(days.map((d) => d.total_calories));
  const avgProtein = avg(days.map((d) => d.total_protein_g));
  const avgCarbs = avg(days.map((d) => d.total_carbs_g));
  const avgFat = avg(days.map((d) => d.total_fat_g));

  const proteinHits = days.filter((d) => d.protein_target_met === 1).length;
  const calorieHits = days.filter((d) => d.calorie_target_met === 1).length;

  // Streak calculation
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let bestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].protein_target_met === 1) {
      if (i === sorted.length - 1) currentStreak++;
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      if (i === sorted.length - 1) currentStreak = 0;
      tempStreak = 0;
    }
  }

  // Best and worst days by adherence score
  const withScores = sorted.filter((d) => d.adherence_score !== null);
  const worstDay =
    withScores.length > 0
      ? withScores.reduce((a, b) =>
          (a.adherence_score ?? 0) < (b.adherence_score ?? 0) ? a : b
        ).date
      : null;
  const bestDay =
    withScores.length > 0
      ? withScores.reduce((a, b) =>
          (a.adherence_score ?? 0) > (b.adherence_score ?? 0) ? a : b
        ).date
      : null;

  // Protein gap analysis
  const target = Number(proteinTarget) > 0 ? Number(proteinTarget) : null;
  if (target == null) {
    return { avgDailyCalories: avgCalories, avgDailyProtein: avgProtein, avgDailyCarbs: avgCarbs, avgDailyFat: avgFat, proteinHitRate: (proteinHits / days.length) * 100, calorieHitRate: (calorieHits / days.length) * 100, bestStreak, currentStreak, worstDay, bestDay, proteinGapAnalysis: "Set a protein target to see gap analysis." };
  }
  const proteinGap = target - avgProtein;
  let proteinGapAnalysis: string;
  if (proteinGap <= 0) {
    proteinGapAnalysis = `Averaging ${avgProtein.toFixed(0)}g — ${Math.abs(proteinGap).toFixed(0)}g above your ${target}g target. Solid.`;
  } else {
    proteinGapAnalysis = `Averaged ${avgProtein.toFixed(0)}g — ${proteinGap.toFixed(0)}g short of your ${target}g target.`;
  }

  return {
    avgDailyCalories: avgCalories,
    avgDailyProtein: avgProtein,
    avgDailyCarbs: avgCarbs,
    avgDailyFat: avgFat,
    proteinHitRate: (proteinHits / days.length) * 100,
    calorieHitRate: (calorieHits / days.length) * 100,
    bestStreak,
    currentStreak,
    worstDay,
    bestDay,
    proteinGapAnalysis,
  };
}

export function computeProteinPace(
  currentProtein: number,
  mealsLogged: number,
  totalMeals: number = 4,
  proteinTarget?: number | null
): { needed: number; perMeal: number; message: string } {
  const target = Number(proteinTarget) > 0 ? Number(proteinTarget) : 0;
  const remaining = Math.max(0, target - currentProtein);
  const mealsLeft = Math.max(1, totalMeals - mealsLogged);
  const perMeal = remaining / mealsLeft;

  let message: string;
  if (remaining <= 0) {
    message = `Protein target hit! ${currentProtein.toFixed(0)}g logged.`;
  } else if (mealsLeft === 1) {
    message = `Need ${remaining.toFixed(0)}g in your final meal to hit target.`;
  } else {
    message = `Need ${remaining.toFixed(0)}g across ${mealsLeft} meals — ${perMeal.toFixed(0)}g per meal.`;
  }

  return { needed: remaining, perMeal, message };
}
