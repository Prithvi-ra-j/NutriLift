import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../client";
import { foodLogs, dailyNutrition, type FoodLog, type NewFoodLog, type DailyNutrition } from "../schema";
import { USER_PROFILE } from "../../constants/user-profile";

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
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  return getDailyNutritionRange(
    sevenDaysAgo.toISOString().split("T")[0],
    today.toISOString().split("T")[0]
  );
}

export async function getLast30DaysNutrition(): Promise<DailyNutrition[]> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);
  return getDailyNutritionRange(
    thirtyDaysAgo.toISOString().split("T")[0],
    today.toISOString().split("T")[0]
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

  const proteinTargetMet = totals.protein_g >= USER_PROFILE.targets.protein_g ? 1 : 0;
  const calorieTargetMet =
    totals.calories >= USER_PROFILE.targets.calories * 0.9 &&
    totals.calories <= USER_PROFILE.targets.calories * 1.1
      ? 1
      : 0;

  // Adherence score: weighted average of protein (60%) + calories (40%)
  const proteinScore = Math.min(100, (totals.protein_g / USER_PROFILE.targets.protein_g) * 100);
  const calorieScore = Math.min(
    100,
    100 - Math.abs(totals.calories - USER_PROFILE.targets.calories) / USER_PROFILE.targets.calories * 100
  );
  const adherenceScore = proteinScore * 0.6 + calorieScore * 0.4;

  const existing = await getDailyNutrition(date);

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
    });
  }
}

// ─── Analytics Helpers ────────────────────────────────────────────────────────

export async function getProteinHitRate(days: number = 30): Promise<number> {
  const nutrition = await getLast30DaysNutrition();
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
