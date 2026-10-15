import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../client";
import { foodLogs, dailyNutrition, type FoodLog, type NewFoodLog, type DailyNutrition } from "../schema";
import { getNutritionTargetsForDate } from "./nutrition-targets";
import { addCalendarDays, toLocalDateKey } from "../../utils/local-date";
import { validateFoodLogInput, validateFoodLogsInput } from "../../data/food-log-validation";
import { calculateTargetComparison } from "../../nutrition/target-validation";

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

export async function insertFoodLogs(logs: NewFoodLog[]): Promise<void> {
  validateFoodLogsInput(logs);
  // The food rows and their daily aggregate commit or roll back together.
  await db.transaction(async (tx: any) => {
    const date = logs[0].date;
    const targets = await getNutritionTargetsForDate(date, tx);
    await tx.insert(foodLogs).values(logs);
    const rows = await tx.select().from(foodLogs).where(eq(foodLogs.date, date));
    const totals = rows.reduce(
      (acc: { calories: number; protein_g: number; carbs_g: number; fat_g: number }, log: FoodLog) => ({
        calories: acc.calories + log.calories,
        protein_g: acc.protein_g + log.protein_g,
        carbs_g: acc.carbs_g + log.carbs_g,
        fat_g: acc.fat_g + log.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const proteinTargetMet = totals.protein_g >= targets.protein_g ? 1 : 0;
    const calorieTargetMet =
      totals.calories >= targets.calories * 0.9 &&
      totals.calories <= targets.calories * 1.1 ? 1 : 0;
    const proteinScore = Math.min(100, (totals.protein_g / targets.protein_g) * 100);
    const calorieScore = calculateCalorieAdherenceScore(totals.calories, targets.calories);
    const summary = {
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      protein_target_met: proteinTargetMet,
      calorie_target_met: calorieTargetMet,
      adherence_score: proteinScore * 0.6 + calorieScore * 0.4,
      updated_at: new Date().toISOString(),
    };
    const existing = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date));
    if (existing.length > 0) {
      await tx.update(dailyNutrition).set(summary).where(eq(dailyNutrition.date, date));
    } else {
      await tx.insert(dailyNutrition).values({ date, ...summary });
    }
  });
}

export async function insertFoodLog(log: NewFoodLog): Promise<void> {
  await insertFoodLogs([log]);
}

export async function deleteFoodLog(id: string, date: string): Promise<void> {
  // Keep the source row and every potentially affected aggregate consistent.
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    const existing = rows[0] as FoodLog | undefined;
    if (!existing) return;
    await tx.delete(foodLogs).where(eq(foodLogs.id, id));
    for (const affectedDate of new Set([existing.date, date])) {
      await recomputeDailyNutritionInTransaction(tx, affectedDate);
    }
  });
}

export async function updateFoodLog(id: string, updates: Partial<NewFoodLog>, date: string): Promise<void> {
  // Read, validate and mutate under one transaction so a concurrent edit cannot
  // be overwritten by a stale pre-transaction snapshot.
  const { id: _ignoredId, ...mutableUpdates } = updates;
  await db.transaction(async (tx: any) => {
    const existingRows = await tx.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    const existing = existingRows[0] as FoodLog | undefined;
    if (!existing) throw new Error("Food log not found.");
    const next = { ...existing, ...mutableUpdates } as FoodLog;
    validateFoodLogInput(next as NewFoodLog);
    const affectedDates = Array.from(new Set([existing.date, next.date, date]));
    await tx.update(foodLogs).set(mutableUpdates).where(eq(foodLogs.id, id));
    for (const affectedDate of affectedDates) {
      await recomputeDailyNutritionInTransaction(tx, affectedDate);
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
  const today = toLocalDateKey();
  return getDailyNutritionRange(addCalendarDays(today, -6), today);
}

export async function getLast30DaysNutrition(): Promise<DailyNutrition[]> {
  const today = toLocalDateKey();
  return getDailyNutritionRange(addCalendarDays(today, -29), today);
}

// ─── Recompute Daily Nutrition ────────────────────────────────────────────────

async function recomputeDailyNutritionInTransaction(tx: any, date: string): Promise<void> {
  const logs = await tx.select().from(foodLogs).where(eq(foodLogs.date, date));
  if (logs.length === 0) {
    await tx.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
    return;
  }

  const targets = await getNutritionTargetsForDate(date);
  const totals = logs.reduce(
    (acc: { calories: number; protein_g: number; carbs_g: number; fat_g: number }, log: FoodLog) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  const comparison = calculateTargetComparison({
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
  }, targets);
  const summary = {
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
    total_carbs_g: totals.carbs_g,
    total_fat_g: totals.fat_g,
    ...comparison,
    updated_at: new Date().toISOString(),
  };
  const existing = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
  if (existing.length) {
    await tx.update(dailyNutrition).set(summary).where(eq(dailyNutrition.date, date));
  } else {
    await tx.insert(dailyNutrition).values({ date, ...summary });
  }
}

export async function recomputeDailyNutrition(date: string): Promise<void> {
  await db.transaction(async (tx: any) => {
    await recomputeDailyNutritionInTransaction(tx, date);
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
