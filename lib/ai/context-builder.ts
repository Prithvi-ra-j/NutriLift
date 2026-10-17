import { getLast7DaysNutrition, getProteinHitRate } from "../db/queries/nutrition";
import { getNutritionTargets } from "../db/queries/nutrition-targets";
import { getUserProfile } from "../db/queries/user-profile";
import { getCurrentCoachRecommendations } from "../analytics/current-coach-recommendations";
import type { CoachRecommendation } from "../analytics/coach-recommendations";
import { getRecentSessions, getAllPRs } from "../db/queries/workout";
import { getLatestInBody, getLatestWeight } from "../db/queries/body";
import { getRecentRecoveryLogs, getSupplementAdherence30d } from "../db/queries/recovery";
import { getPreviousWeeksAISummaries } from "./weekly-summary-service";
import type { DailyNutrition, WorkoutSession } from "../db/schema";
import {
  approvedBodyStat,
  approvedNutritionRows,
  approvedPersonalRecords,
  approvedRecoveryRows,
  approvedSummaryRows,
  approvedWorkoutRows,
  buildApprovedCoachProfile,
} from "./coach-context-policy";

export interface CoachContext {
  context_version: "2.0";
  generated_at: string;
  missing_data: string[];
  user_profile: ReturnType<typeof buildApprovedCoachProfile>;
  last_7_days_nutrition: ReturnType<typeof approvedNutritionRows>;
  previous_weeks_ai_summaries: Array<{ week_start: string; week_end: string; summary: string }>;
  last_30_days_adherence: { protein_hit_rate: number };
  recent_workouts: ReturnType<typeof approvedWorkoutRows>;
  current_prs: ReturnType<typeof approvedPersonalRecords>;
  latest_body_stats: ReturnType<typeof approvedBodyStat>;
  last_inbody: ReturnType<typeof approvedBodyStat>;
  supplement_adherence_30d: Record<string, number>;
  last_recovery_logs: ReturnType<typeof approvedRecoveryRows>;
  today_nutrition: ReturnType<typeof approvedNutritionRows>[number] | null;
  today_workout: ReturnType<typeof approvedWorkoutRows>[number] | null;
  today_recommendations: CoachRecommendation[];
}

/**
 * Build a least-privilege coaching context from approved, structured facts.
 * Free-form notes and detailed supplement/structural-health profile fields are
 * intentionally excluded. Missing data is represented explicitly, not inferred.
 */
export async function buildCoachContext(
  todayNutrition: DailyNutrition | null,
  todayWorkout: WorkoutSession | null
): Promise<CoachContext> {
  const [
    last7DaysNutrition,
    previousWeeksAISummaries,
    recentWorkouts,
    currentPRs,
    latestWeight,
    lastInBody,
    supplementAdherence,
    recoveryLogs,
    proteinHitRate,
    currentTargets,
    todayRecommendations,
    persistedProfile,
  ] = await Promise.all([
    getLast7DaysNutrition(),
    getPreviousWeeksAISummaries(),
    getRecentSessions(2),
    getAllPRs(),
    getLatestWeight(),
    getLatestInBody(),
    getSupplementAdherence30d(),
    getRecentRecoveryLogs(2),
    getProteinHitRate(30),
    getNutritionTargets(),
    getCurrentCoachRecommendations(),
    getUserProfile(),
  ]);

  const approvedNutrition = approvedNutritionRows(last7DaysNutrition);
  const approvedWorkouts = approvedWorkoutRows(recentWorkouts);
  const approvedTodayNutrition = todayNutrition
    ? approvedNutritionRows([todayNutrition])[0] ?? null
    : null;
  const approvedTodayWorkout = todayWorkout
    ? approvedWorkoutRows([todayWorkout])[0] ?? null
    : null;

  const missingData: string[] = [];
  if (approvedNutrition.length < 7) {
    missingData.push(`Nutrition is logged for ${approvedNutrition.length} of the last 7 days.`);
  }
  if (approvedWorkouts.length === 0) missingData.push("No recent workout is logged.");
  if (recoveryLogs.length === 0) missingData.push("No recent recovery data is logged.");
  if (!latestWeight) missingData.push("No bodyweight is logged.");
  if (!approvedTodayNutrition) missingData.push("Today has no nutrition summary yet.");

  return {
    context_version: "2.0",
    generated_at: new Date().toISOString(),
    missing_data: missingData,
    user_profile: buildApprovedCoachProfile(currentTargets, persistedProfile),
    last_7_days_nutrition: approvedNutrition,
    previous_weeks_ai_summaries: approvedSummaryRows(previousWeeksAISummaries, 3),
    last_30_days_adherence: { protein_hit_rate: proteinHitRate },
    recent_workouts: approvedWorkouts,
    current_prs: approvedPersonalRecords(currentPRs),
    latest_body_stats: approvedBodyStat(latestWeight),
    last_inbody: approvedBodyStat(lastInBody),
    supplement_adherence_30d: supplementAdherence,
    last_recovery_logs: approvedRecoveryRows(recoveryLogs),
    today_nutrition: approvedTodayNutrition,
    today_workout: approvedTodayWorkout,
    today_recommendations: todayRecommendations,
  };
}
