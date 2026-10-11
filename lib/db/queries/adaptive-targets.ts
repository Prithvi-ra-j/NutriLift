import { and, eq, gte } from "drizzle-orm";
import { addCalendarDays, toLocalDateKey } from "../../utils/local-date";
import { estimateAdaptiveTarget, type AdaptiveTargetResult } from "../../nutrition/adaptive-targets";
import { db } from "../client";
import { bodyStats, dailyNutrition, foodLogs, nutritionDayStatus } from "../schema";
import { getNutritionTargets } from "./nutrition-targets";

/** Build an advisory recommendation from local, explicitly complete days and valid weigh-ins. */
export async function getAdaptiveTargetRecommendation(): Promise<AdaptiveTargetResult> {
  const today = toLocalDateKey();
  const startDate = addCalendarDays(today, -29);
  const [targets, nutritionRows, statuses, logs, weights] = await Promise.all([
    getNutritionTargets(),
    db.select().from(dailyNutrition).where(gte(dailyNutrition.date, startDate)).orderBy(dailyNutrition.date),
    db.select().from(nutritionDayStatus).where(and(gte(nutritionDayStatus.date, startDate), eq(nutritionDayStatus.is_complete, 1))),
    db.select().from(foodLogs).where(gte(foodLogs.date, startDate)),
    db.select().from(bodyStats).where(and(gte(bodyStats.date, startDate), eq(bodyStats.type, "weight"))).orderBy(bodyStats.date),
  ]);

  const completeDates = new Set(statuses.map((status) => status.date));
  const logsByDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const current = logsByDate.get(log.date) ?? [];
    current.push(log);
    logsByDate.set(log.date, current);
  }

  const intakeDays = nutritionRows.map((row) => {
    const dayLogs = logsByDate.get(row.date) ?? [];
    const unresolved = dayLogs.some((log) => log.confidence === "low" || (log.calories === 0 && log.protein_g === 0 && log.carbs_g === 0 && log.fat_g === 0));
    const knownQuality = dayLogs.length > 0 && dayLogs.every((log) => log.confidence === "high" || log.confidence === "medium");
    return {
      date: row.date,
      calories: row.total_calories,
      complete: completeDates.has(row.date) && !unresolved,
      quality: (unresolved || !knownQuality ? "unresolved" : dayLogs.every((log) => log.confidence === "high") ? "verified" : "reviewed") as "verified" | "reviewed" | "estimated" | "unresolved",
    };
  });

  return estimateAdaptiveTarget({
    intakeDays,
    weights: weights.flatMap((row) => row.weight_kg === null ? [] : [{ date: row.date, weightKg: row.weight_kg }]),
    currentTargetKcal: targets.calories,
    goal: targets.goal,
  });
}
