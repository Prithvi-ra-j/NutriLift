import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { db } from "../client";
import { foodLogs, dailyNutrition, type FoodLog, type NewFoodLog, type DailyNutrition } from "../schema";
import { getTargetsForDate } from "../../data/profile";
import { adherenceScore, sumFoodLogs } from "../../domain/nutrition";
import { inTx } from "../tx";
import { nowIso } from "../../time/clock";
import { getAppSetting } from "../../data/appSettings";
import { isTrackingPausedOnDate } from "../../pauseMode";
import { addDays, localDateString } from "../../time/localDate";

// ─── Food Log Queries ─────────────────────────────────────────────────────────

export async function getFoodLogsForDate(date: string): Promise<FoodLog[]> {
  return db.select().from(foodLogs).where(and(
    eq(foodLogs.date, date),
    isNull(foodLogs.deleted_at),
  ));
}

export async function getFoodLogsByMeal(date: string, meal: string): Promise<FoodLog[]> {
  return db
    .select()
    .from(foodLogs)
    .where(and(
      eq(foodLogs.date, date),
      eq(foodLogs.meal, meal),
      isNull(foodLogs.deleted_at),
    ));
}

export async function insertFoodLog(log: NewFoodLog): Promise<void> {
  await insertFoodLogs([log]);
}

export async function insertFoodLogs(logs: NewFoodLog[]): Promise<void> {
  if (logs.length === 0) return;
  await inTx(async () => {
    const timestamp = nowIso();
    await db.insert(foodLogs).values(
      logs.map((log) => ({
        ...log,
        updated_at: timestamp,
        deleted_at: null,
      })),
    );
    for (const date of new Set(logs.map((log) => log.date))) {
      await recomputeDailyNutritionInTransaction(date);
    }
  });
}

export async function deleteFoodLog(id: string, date: string): Promise<void> {
  await inTx(async () => {
    const timestamp = nowIso();
    await db
      .update(foodLogs)
      .set({ deleted_at: timestamp, updated_at: timestamp })
      .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    await recomputeDailyNutritionInTransaction(date);
  });
}

export async function updateFoodLog(id: string, updates: Partial<NewFoodLog>, date: string): Promise<void> {
  await inTx(async () => {
    const timestamp = nowIso();
    await db
      .update(foodLogs)
      .set({ ...updates, updated_at: timestamp })
      .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    for (const affectedDate of new Set([date, updates.date ?? date])) {
      await recomputeDailyNutritionInTransaction(affectedDate);
    }
  });
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
  const today = localDateString();
  return getDailyNutritionRange(
    addDays(today, -6),
    today,
  );
}

export async function getLast30DaysNutrition(): Promise<DailyNutrition[]> {
  const today = localDateString();
  return getDailyNutritionRange(
    addDays(today, -29),
    today,
  );
}

// ─── Recompute Daily Nutrition ────────────────────────────────────────────────

export async function recomputeDailyNutrition(date: string): Promise<void> {
  await inTx(() => recomputeDailyNutritionInTransaction(date));
}

export async function recomputeDailyNutritionInTransaction(date: string): Promise<void> {
  const logs = await getFoodLogsForDate(date);
  const totals = sumFoodLogs(logs);

  const targets = await getTargetsForDate(date);
  const pauseSettings = await Promise.all([
    getAppSetting("pause_from"),
    getAppSetting("pause_until"),
  ]);
  const paused = isTrackingPausedOnDate(date, pauseSettings[0], pauseSettings[1]);
  const proteinTargetMet = paused
    ? null
    : totals.protein_g >= targets.protein_g ? 1 : 0;
  const calorieTargetMet = paused
    ? null
    : totals.calories >= targets.calories * 0.9 &&
        totals.calories <= targets.calories * 1.1
      ? 1
      : 0;

  const score = paused ? null : adherenceScore(totals, targets, logs.length);
  const updatedAt = nowIso();
  await db
    .insert(dailyNutrition)
    .values({
      date,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      protein_target_met: proteinTargetMet,
      calorie_target_met: calorieTargetMet,
      adherence_score: score,
      targets_snapshot: JSON.stringify({
        calories: targets.calories,
        protein_g: targets.protein_g,
        carbs_g: targets.carbs_g,
        fat_g: targets.fat_g,
      }),
      food_count: logs.length,
      updated_at: updatedAt,
    })
    .onConflictDoUpdate({
      target: dailyNutrition.date,
      set: {
        total_calories: totals.calories,
        total_protein_g: totals.protein_g,
        total_carbs_g: totals.carbs_g,
        total_fat_g: totals.fat_g,
        protein_target_met: proteinTargetMet,
        calorie_target_met: calorieTargetMet,
        adherence_score: score,
        targets_snapshot: JSON.stringify({
          calories: targets.calories,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
        }),
        food_count: logs.length,
        updated_at: updatedAt,
      },
    });
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