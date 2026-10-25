import { getDailyNutritionRange } from "../data/repositories/nutrition";
import { getSessionsForDateRange, getAllPRs } from "../data/repositories/workout";
import { getBodyStatsForDateRange } from "../data/repositories/body";
import { getRecoveryLogsForDateRange } from "../data/repositories/recovery";
import { getProfile, getTargetsForDate } from "../data/profile";
import { getAiContextPreferences, getMinimumCalorieFloor } from "./preferences";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "./riskPhrases";
import { AiError } from "./gateway";
import { localDateString, addDays } from "../time/localDate";
import { getEligibleBodyCompTimeOfDay } from "../analytics/bodyCompSafety";
import { summarizeNutrition, type NutritionAggregate } from "./nutritionAggregate";
import { getTrackingPauseStatus } from "../pauseMode";

export type CoachContext = {
  context_version: "2.0";
  period: { start_7d: string; start_28d: string; end: string };
  nutrition_7d: NutritionAggregate;
  nutrition_28d: NutritionAggregate;
  training_7d: { sessions: number; volume_kg: number; personal_records: string[] };
  training_28d: {
    sessions: number;
    volume_kg: number;
    weekly_volume_trend: "increasing" | "stable" | "decreasing";
    personal_records: string[];
  };
  recovery_28d: { days_logged: number; average_sleep_hours: number | null };
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  body_measurements?: {
    latest_weight_kg: number | null;
    weight_date: string | null;
    latest_body_fat_pct: number | null;
    body_fat_date: string | null;
  };
  coach_notes?: string;
  missing_data: string[];
};

function average(values: number[]): number {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function volume(rows: Awaited<ReturnType<typeof getSessionsForDateRange>>): number {
  return Math.round(rows.reduce((sum, session) => sum + (session.total_volume_kg ?? 0), 0));
}

function volumeTrend(
  recent: number,
  previous: number,
): "increasing" | "stable" | "decreasing" {
  if (Math.abs(recent - previous) <= Math.max(recent, previous) * 0.05) return "stable";
  return recent > previous ? "increasing" : "decreasing";
}

function recentPrNames(
  records: Awaited<ReturnType<typeof getAllPRs>>,
  start: string,
  end: string,
): string[] {
  return records
    .filter((record) => record.achieved_date >= start && record.achieved_date <= end)
    .sort((a, b) => b.achieved_date.localeCompare(a.achieved_date))
    .slice(0, 10)
    .map((record) => `${record.exercise_name}: ${record.best_weight_kg} kg`);
}

export async function buildCoachContext(): Promise<CoachContext> {
  const today = localDateString();
  const start7 = addDays(today, -6);
  const start28 = addDays(today, -27);
  const start14 = addDays(today, -13);
  const [
    nutrition7,
    nutrition28,
    sessions7,
    sessions28,
    sessionsPreviousWeek,
    prs,
    recovery,
    bodyStats,
    profile,
    targets,
    preferences,
    minimumCalories,
    pauseStatus,
  ] = await Promise.all([
    getDailyNutritionRange(start7, today),
    getDailyNutritionRange(start28, today),
    getSessionsForDateRange(start7, today),
    getSessionsForDateRange(start28, today),
    getSessionsForDateRange(start14, addDays(start7, -1)),
    getAllPRs(),
    getRecoveryLogsForDateRange(start28, today),
    getBodyStatsForDateRange(start28, today),
    getProfile(),
    getTargetsForDate(today),
    getAiContextPreferences(),
    getMinimumCalorieFloor(),
    getTrackingPauseStatus(today),
  ]);

  const missingData: string[] = [];
  if (nutrition7.length === 0) missingData.push("No nutrition was logged in the last 7 days.");
  if (sessions28.length === 0) missingData.push("No workout was logged in the last 28 days.");
  if (recovery.length === 0) missingData.push("No recovery data was logged in the last 28 days.");

  const context: CoachContext = {
    context_version: "2.0",
    period: { start_7d: start7, start_28d: start28, end: today },
    nutrition_7d: summarizeNutrition(nutrition7, pauseStatus.from, pauseStatus.until),
    nutrition_28d: summarizeNutrition(nutrition28, pauseStatus.from, pauseStatus.until),
    training_7d: {
      sessions: sessions7.length,
      volume_kg: volume(sessions7),
      personal_records: recentPrNames(prs, start7, today),
    },
    training_28d: {
      sessions: sessions28.length,
      volume_kg: volume(sessions28),
      weekly_volume_trend: volumeTrend(volume(sessions7), volume(sessionsPreviousWeek)),
      personal_records: recentPrNames(prs, start28, today),
    },
    recovery_28d: {
      days_logged: recovery.length,
      average_sleep_hours: recovery.some((row) => row.sleep_duration_hr !== null)
        ? Number(average(
          recovery
            .map((row) => row.sleep_duration_hr)
            .filter((value): value is number => value !== null),
        ).toFixed(1))
        : null,
    },
    targets: {
      calories: Math.max(minimumCalories, targets.calories),
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
    },
    missing_data: missingData,
  };

  const bodyCompTimeOfDay = getEligibleBodyCompTimeOfDay(bodyStats);
  const eligibleBodyStats = bodyCompTimeOfDay
    ? bodyStats.filter((stat) => stat.measurement_time_of_day === bodyCompTimeOfDay)
    : [];
  const eligibleWeights = eligibleBodyStats
    .filter((stat) => stat.weight_kg !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const eligibleInBody = eligibleBodyStats
    .filter((stat) => stat.body_fat_pct !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (preferences.includeBodyMeasurements && bodyCompTimeOfDay) {
    context.body_measurements = {
      latest_weight_kg: eligibleWeights[0]?.weight_kg ?? null,
      weight_date: eligibleWeights[0]?.date ?? null,
      latest_body_fat_pct: eligibleInBody[0]?.body_fat_pct ?? null,
      body_fat_date: eligibleInBody[0]?.date ?? null,
    };
  }
  if (preferences.includeInjuriesAndNotes && profile?.coach_notes) {
    if (containsEatingSafetyRisk(profile.coach_notes)) {
      throw new AiError("safety", AI_SAFETY_RESPONSE);
    }
    context.coach_notes = profile.coach_notes.slice(0, 500);
  }

  for (const [section, value] of Object.entries(context)) {
    if (JSON.stringify(value).length > 2_000) {
      throw new RangeError(`AI context section "${section}" exceeds the 2,000-character limit.`);
    }
  }
  return context;
}
