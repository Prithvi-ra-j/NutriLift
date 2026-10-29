import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { foodLogs, dailyNutrition, type FoodLog, type NewFoodLog, type DailyNutrition } from "../db/schema";
import { getTargetsForDate } from "../profile";
import { adherenceScore, sumFoodLogs } from "../../domain/nutrition";
import { inRead, inTx } from "../db/tx";
import { nowIso } from "../../time/clock";
import { getAppSetting } from "../appSettings";
import { getTrackingPauseStatus, isTrackingPausedOnDate } from "../../pauseMode";
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

export async function insertFoodLog(log: NewFoodLog): Promise<NutritionMutationResult> {
  return insertFoodLogs([log]);
}

export type NutritionMutationResult = {
  saved: FoodLog[];
  summaries: DailyNutrition[];
};

export async function insertFoodLogs(
  logs: NewFoodLog[],
): Promise<NutritionMutationResult> {
  if (logs.length === 0) return { saved: [], summaries: [] };
  return inTx(async () => {
    const timestamp = nowIso();
    const saved: FoodLog[] = logs.map((log) => ({
      ...log,
      quantity_g: log.quantity_g ?? null,
      fiber_g: log.fiber_g ?? null,
      sugar_g: log.sugar_g ?? null,
      sodium_mg: log.sodium_mg ?? null,
      raw_input: log.raw_input ?? null,
      updated_at: timestamp,
      deleted_at: null,
    }));
    await db.insert(foodLogs).values(saved);
    const summaries: DailyNutrition[] = [];
    for (const date of new Set(saved.map((log) => log.date))) {
      await recomputeDailyNutritionInTransaction(date);
      const summary = await getDailyNutrition(date);
      if (!summary) throw new Error(`Daily nutrition summary for ${date} was not saved.`);
      summaries.push(summary);
    }
    return { saved, summaries };
  });
}

export async function deleteFoodLog(
  id: string,
  date: string,
): Promise<NutritionMutationResult> {
  return inTx(async () => {
    const [existing] = await db
      .select()
      .from(foodLogs)
      .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    const timestamp = nowIso();
    if (existing) {
      await db
        .update(foodLogs)
        .set({ deleted_at: timestamp, updated_at: timestamp })
        .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    }
    await recomputeDailyNutritionInTransaction(date);
    const summary = await getDailyNutrition(date);
    if (!summary) throw new Error(`Daily nutrition summary for ${date} is missing.`);
    return {
      saved: existing
        ? [{ ...existing, deleted_at: timestamp, updated_at: timestamp }]
        : [],
      summaries: [summary],
    };
  });
}

export async function restoreFoodLog(
  id: string,
  date: string,
): Promise<NutritionMutationResult> {
  return inTx(async () => {
    const [existing] = await db
      .select()
      .from(foodLogs)
      .where(and(eq(foodLogs.id, id), eq(foodLogs.date, date)));
    const timestamp = nowIso();
    if (existing?.deleted_at) {
      await db
        .update(foodLogs)
        .set({ deleted_at: null, updated_at: timestamp })
        .where(and(eq(foodLogs.id, id), eq(foodLogs.date, date)));
    }
    await recomputeDailyNutritionInTransaction(date);
    const summary = await getDailyNutrition(date);
    if (!summary) throw new Error(`Daily nutrition summary for ${date} is missing.`);
    const [restored] = existing?.deleted_at
      ? await db
        .select()
        .from(foodLogs)
        .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)))
      : [];
    return {
      saved: restored ? [restored] : [],
      summaries: [summary],
    };
  });
}

export async function updateFoodLog(
  id: string,
  updates: Partial<NewFoodLog>,
  date: string,
): Promise<NutritionMutationResult> {
  return inTx(async () => {
    const dates = [...new Set([date, updates.date ?? date])];
    const [existing] = await db
      .select()
      .from(foodLogs)
      .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    const timestamp = nowIso();
    let saved: FoodLog[] = [];
    if (existing) {
      await db
        .update(foodLogs)
        .set({ ...updates, updated_at: timestamp })
        .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
      saved = await db
        .select()
        .from(foodLogs)
        .where(and(eq(foodLogs.id, id), isNull(foodLogs.deleted_at)));
    }
    const summaries: DailyNutrition[] = [];
    for (const affectedDate of dates) {
      await recomputeDailyNutritionInTransaction(affectedDate);
      const summary = await getDailyNutrition(affectedDate);
      if (!summary) {
        throw new Error(`Daily nutrition summary for ${affectedDate} is missing.`);
      }
      summaries.push(summary);
    }
    return {
      saved,
      summaries,
    };
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

export async function getNutritionDay(
  date: string,
  asOfDate: string = localDateString(),
) {
  return inRead(async () => {
    const trendDates = Array.from({ length: 7 }, (_, index) =>
      addDays(asOfDate, index - 6)
    );
    const nutrition = await getDailyNutrition(date);
    const foodLogs = await getFoodLogsForDate(date);
    const last7Days = await getDailyNutritionRange(
      addDays(asOfDate, -6),
      asOfDate,
    );
    const targets = await getTargetsForDate(date);
    const trackingPause = await getTrackingPauseStatus(asOfDate);
    const proteinTargetsByDate: Record<string, number> = {};
    for (const trendDate of trendDates) {
      const dayTargets = await getTargetsForDate(trendDate);
      proteinTargetsByDate[trendDate] = dayTargets.protein_g;
    }

    return {
      nutrition,
      foodLogs,
      last7Days,
      targets,
      trackingPause,
      proteinTargetsByDate,
    };
  });
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