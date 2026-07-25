import { USER_PROFILE } from "../constants/user-profile";
import { getLast7DaysNutrition, getProteinHitRate } from "../db/queries/nutrition";
import { getRecentSessions, getAllPRs } from "../db/queries/workout";
import { getLatestInBody, getLatestWeight } from "../db/queries/body";
import { getRecentRecoveryLogs, getSupplementAdherence30d } from "../db/queries/recovery";
import { getPreviousWeeksAISummaries } from "./weekly-summary-service";
import { getPreviousMonthsAISummaries } from "./monthly-summary-service";
import { getPreviousQuartersAISummaries } from "./quarterly-summary-service";
import { getPreviousYearsAISummaries } from "./yearly-summary-service";
import type { DailyNutrition, WorkoutSession, PersonalRecord, BodyStat, RecoveryLog } from "../db/schema";

export interface CoachContext {
  user_profile: typeof USER_PROFILE;
  last_7_days_nutrition: DailyNutrition[];
  previous_weeks_ai_summaries: Array<{ week_start: string; week_end: string; summary: string }>;
  previous_months_ai_summaries?: Array<{ month: string; summary: string }>;
  previous_quarters_ai_summaries?: Array<{ quarter: string; summary: string }>;
  previous_years_ai_summaries?: Array<{ year: string; summary: string }>;
  last_30_days_adherence: {
    protein_hit_rate: number;
  };
  recent_workouts: WorkoutSession[];
  current_prs: PersonalRecord[];
  latest_body_stats: BodyStat | null;
  last_inbody: BodyStat | null;
  supplement_adherence_30d: Record<string, number>;
  last_recovery_logs: RecoveryLog[];
  today_nutrition: DailyNutrition | null;
  today_workout: WorkoutSession | null;
}

/**
 * Build coach context with intelligent time-based summarization
 * 
 * Context strategy:
 * - Last 7 days: Full detailed daily data (~2,500 tokens)
 * - Previous 3 weeks: AI-generated weekly summaries (~450 tokens)
 * - Previous 2 months: AI-generated monthly summaries (~700 tokens)
 * - Previous quarter: AI-generated quarterly summary (~900 tokens)
 * - Previous years: AI-generated yearly summaries (~1,200 tokens per year)
 * 
 * This keeps token usage under 7,000 even with years of data
 */

export async function buildCoachContext(
  todayNutrition: DailyNutrition | null,
  todayWorkout: WorkoutSession | null
): Promise<CoachContext> {
  const [
    last7DaysNutrition,
    previousWeeksAISummaries,
    previousMonthsAISummaries,
    previousQuartersAISummaries,
    previousYearsAISummaries,
    recentWorkouts,
    currentPRs,
    latestWeight,
    lastInBody,
    supplementAdherence,
    recoveryLogs,
    proteinHitRate,
  ] = await Promise.all([
    getLast7DaysNutrition(),
    getPreviousWeeksAISummaries(), // Last 3 weeks
    getPreviousMonthsAISummaries(), // Last 2 months
    getPreviousQuartersAISummaries(), // Last 1 quarter
    getPreviousYearsAISummaries(), // Last 5 years
    getRecentSessions(2),
    getAllPRs(),
    getLatestWeight(),
    getLatestInBody(),
    getSupplementAdherence30d(),
    getRecentRecoveryLogs(2),
    getProteinHitRate(30),
  ]);

  return {
    user_profile: USER_PROFILE,
    last_7_days_nutrition: last7DaysNutrition,
    previous_weeks_ai_summaries: previousWeeksAISummaries,
    previous_months_ai_summaries: previousMonthsAISummaries.length > 0 ? previousMonthsAISummaries : undefined,
    previous_quarters_ai_summaries: previousQuartersAISummaries.length > 0 ? previousQuartersAISummaries : undefined,
    previous_years_ai_summaries: previousYearsAISummaries.length > 0 ? previousYearsAISummaries : undefined,
    last_30_days_adherence: {
      protein_hit_rate: proteinHitRate,
    },
    recent_workouts: recentWorkouts,
    current_prs: currentPRs,
    latest_body_stats: latestWeight,
    last_inbody: lastInBody,
    supplement_adherence_30d: supplementAdherence,
    last_recovery_logs: recoveryLogs,
    today_nutrition: todayNutrition,
    today_workout: todayWorkout,
  };
}
