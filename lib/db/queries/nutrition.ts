import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getDateDaysAgo, getTodayKey } from "../../dates";
import { db } from "../client";
import { foodLogs, dailyNutrition, type FoodLog, type NewFoodLog, type DailyNutrition } from "../schema";
import { getUserProfile } from "./profile";

// ─── Food Log Queries ─────────────────────────────────────────────────────────

export async function getFoodLogsForDate(date: string): Promise<FoodLog[]> {
  return db.select().from(foodLogs).where(eq(foodLogs.date, date));
}

export async function getFoodLogsByMeal(date: string, meal: string): Promise<FoodLog[]> {
  return db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.date, date), eq(foodLogs.meal, meal)));
}

export async function getMealsLoggedForDate(date: string): Promise<number> {
  const logs = await getFoodLogsForDate(date);
  return new Set(logs.map((log) => log.meal)).size;
}

export async function insertFoodLog(log: NewFoodLog): Promise<void> {
  await db.insert(foodLogs).values(log);
  await recomputeDailyNutrition(log.date);
}

export async function deleteFoodLog(id: string, date: string): Promise<void> {
  await db.delete(foodLogs).where(eq(foodLogs.id, id));
  await recomputeDailyNutrition(date);
}

export async function updateFoodLog(id: string, updates: Partial<NewFoodLog>, date: string): Promise<void> {
  await db.update(foodLogs).set(updates).where(eq(foodLogs.id, id));
  await recomputeDailyNutrition(date);
}


export async function getRecentFoodLogs(limit: number = 12): Promise<FoodLog[]> {
  return db.select().from(foodLogs).orderBy(desc(foodLogs.created_at)).limit(limit);
}

export async function getDistinctRecentFoods(limit: number = 12): Promise<FoodLog[]> {
  const logs = await getRecentFoodLogs(Math.max(limit * 4, 24));
  const seen = new Set<string>();
  return logs.filter(log => {
    const key = log.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// ─── Daily Nutrition Queries ──────────────────────────────────────────────────

export async function getDailyNutrition(date: string): Promise<DailyNutrition | null> {
  const result = await db
    .select()
    .from(dailyNutrition)
    .where(eq(dailyNutrition.date, date));
  return result[0] ?? null;
}

export async function getDailyNutritionRange(
  startDate: string,
  endDate: string
): Promise<DailyNutrition[]> {
  return db
    .select()
    .from(dailyNutrition)
    .where(and(gte(dailyNutrition.date, startDate), lte(dailyNutrition.date, endDate)))
    .orderBy(dailyNutrition.date);
}

export async function getLast7DaysNutrition(): Promise<DailyNutrition[]> {
  
  return getDailyNutritionRange(
    getDateDaysAgo(6),
    getTodayKey()
  );
}

export async function getLast30DaysNutrition(): Promise<DailyNutrition[]> {
  
  return getDailyNutritionRange(
    getDateDaysAgo(29),
    getTodayKey()
  );
}

// ─── Recompute Daily Nutrition ────────────────────────────────────────────────

export async function recomputeDailyNutrition(date: string): Promise<void> {
  const logs = await getFoodLogsForDate(date);

  if (logs.length === 0) {
    await db.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
    return;
  }

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const profile = await getUserProfile();
  const calorieTarget = profile?.calories_target;
  const proteinTarget = profile?.protein_target_g;
  const hasCalorieTarget = Number.isFinite(calorieTarget) && calorieTarget! > 0;
  const hasProteinTarget = Number.isFinite(proteinTarget) && proteinTarget! > 0;
  const proteinTargetMet = hasProteinTarget ? (totals.protein_g >= proteinTarget! ? 1 : 0) : null;
  const calorieTargetMet = hasCalorieTarget
    ? (totals.calories >= calorieTarget! * 0.9 && totals.calories <= calorieTarget! * 1.1 ? 1 : 0)
    : null;

  // Adherence uses only configured targets; missing targets remain neutral.
  const proteinScore = hasProteinTarget ? Math.min(100, (totals.protein_g / proteinTarget!) * 100) : null;
  const calorieScore = hasCalorieTarget ? Math.min(100, Math.max(0, 100 - Math.abs(totals.calories - calorieTarget!) / calorieTarget! * 100)) : null;
  const weightedScores = [
    proteinScore == null ? null : { score: proteinScore, weight: 0.6 },
    calorieScore == null ? null : { score: calorieScore, weight: 0.4 },
  ].filter((x): x is { score: number; weight: number } => x !== null);
  const totalWeight = weightedScores.reduce((sum, x) => sum + x.weight, 0);
  const adherenceScore = totalWeight > 0 ? weightedScores.reduce((sum, x) => sum + x.score * x.weight, 0) / totalWeight : null;

  const existing = await getDailyNutrition(date);
  const updatedAt = new Date().toISOString();

  if (existing) {
    await db
      .update(dailyNutrition)
      .set({
        total_calories: totals.calories,
        total_protein_g: totals.protein_g,
        total_carbs_g: totals.carbs_g,
        total_fat_g: totals.fat_g,
        protein_target_met: proteinTargetMet,
        calorie_target_met: calorieTargetMet,
        adherence_score: adherenceScore,
        updated_at: updatedAt,
      })
      .where(eq(dailyNutrition.date, date));
  } else {
    await db.insert(dailyNutrition).values({
      date,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      protein_target_met: proteinTargetMet,
      calorie_target_met: calorieTargetMet,
      adherence_score: adherenceScore,
      updated_at: updatedAt,
    });
  }
}

// ─── Analytics Helpers ────────────────────────────────────────────────────────

export async function getProteinHitRate(days: number = 30): Promise<number> {
  const nutrition = days >= 30 ? await getLast30DaysNutrition() : await getDailyNutritionRange(getDateDaysAgo(Math.max(0, days - 1)), getTodayKey());
  if (nutrition.length === 0) return 0;
  const hits = nutrition.filter((d) => d.protein_target_met === 1).length;
  return (hits / nutrition.length) * 100;
}

export async function getBestProteinStreak(): Promise<number> {
  const nutrition = await getLast30DaysNutrition();
  let best = 0;
  let current = 0;
  for (const day of nutrition) {
    if (day.protein_target_met === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
