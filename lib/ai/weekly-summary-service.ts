// @ts-nocheck
import uuid from "react-native-uuid";
import { getDailyNutritionRange } from "../db/queries/nutrition";
import { getSessionsForDateRange } from "../db/queries/workout";
import { getRecoveryLogsForDateRange } from "../db/queries/recovery";
import { getBodyStatsForDateRange } from "../db/queries/body";
import { getWeeklySummary, insertWeeklySummary, getPreviousWeeklySummaries } from "../db/queries/reports";
import { generateWeeklySummary } from "../groq/generateCoachResponse";
import type { WeeklySummary } from "../db/schema";

/**
 * Generate or retrieve AI-powered weekly summary
 * Summaries are cached in the database and only generated once per week
 */
export async function getOrGenerateWeeklySummary(weekStart: string, weekEnd: string): Promise<WeeklySummary | null> {
  // Check if summary already exists
  const existing = await getWeeklySummary(weekStart);
  if (existing) {
    return existing;
  }

  // Don't generate summary for current week (incomplete data)
  const today = new Date();
  const weekEndDate = new Date(weekEnd);
  if (weekEndDate >= today) {
    return null; // Current week - don't generate yet
  }

  try {
    // Gather week data
    const [nutrition, workouts, recovery, bodyStats] = await Promise.all([
      getDailyNutritionRange(weekStart, weekEnd),
      getSessionsForDateRange(weekStart, weekEnd),
      getRecoveryLogsForDateRange(weekStart, weekEnd),
      getBodyStatsForDateRange(weekStart, weekEnd),
    ]);

    // Calculate nutrition stats
    const nutritionStats = nutrition.length > 0 ? {
      avg_calories: Math.round(nutrition.reduce((sum, d) => sum + d.total_calories, 0) / nutrition.length),
      avg_protein: Math.round(nutrition.reduce((sum, d) => sum + d.total_protein_g, 0) / nutrition.length),
      protein_hit_rate: Math.round((nutrition.filter(d => d.protein_target_met === 1).length / nutrition.length) * 100),
      adherence_score: Math.round(nutrition.reduce((sum, d) => sum + d.adherence_score, 0) / nutrition.length),
      days_logged: nutrition.length,
    } : {
      avg_calories: 0,
      avg_protein: 0,
      protein_hit_rate: 0,
      adherence_score: 0,
      days_logged: 0,
    };

    // Calculate workout stats
    const workoutStats = workouts.length > 0 ? {
      sessions_completed: workouts.length,
      total_volume_kg: Math.round(workouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0)),
      prs_achieved: 0, // TODO: Count PRs from this week
      avg_rpe: workouts.filter(w => w.rpe).length > 0
        ? Math.round(workouts.reduce((sum, w) => sum + (w.rpe || 0), 0) / workouts.filter(w => w.rpe).length)
        : 0,
    } : {
      sessions_completed: 0,
      total_volume_kg: 0,
      prs_achieved: 0,
      avg_rpe: 0,
    };

    // Calculate recovery stats
    const recoveryStats = recovery.length > 0 ? {
      avg_sleep_hr: recovery.reduce((sum, r) => sum + (r.sleep_duration_hr || 0), 0) / recovery.length,
      avg_energy: recovery.filter(r => r.energy_level).length > 0
        ? Math.round(recovery.reduce((sum, r) => sum + (r.energy_level || 0), 0) / recovery.filter(r => r.energy_level).length)
        : 0,
      avg_soreness: recovery.filter(r => r.muscle_soreness).length > 0
        ? Math.round(recovery.reduce((sum, r) => sum + (r.muscle_soreness || 0), 0) / recovery.filter(r => r.muscle_soreness).length)
        : 0,
    } : {
      avg_sleep_hr: 0,
      avg_energy: 0,
      avg_soreness: 0,
    };

    // Calculate body stats
    const bodyStatsData = bodyStats.length >= 2 ? {
      weight_change_kg: bodyStats[bodyStats.length - 1].weight_kg! - bodyStats[0].weight_kg!,
      starting_weight: bodyStats[0].weight_kg,
      ending_weight: bodyStats[bodyStats.length - 1].weight_kg,
    } : {};

    // Generate AI summary
    const aiSummary = await generateWeeklySummary({
      week_start: weekStart,
      week_end: weekEnd,
      nutrition: nutritionStats,
      workouts: workoutStats,
      recovery: recoveryStats,
      body: bodyStatsData,
    });

    // Store in database
    const summary: WeeklySummary = {
      id: uuid.v4() as string,
      week_start: weekStart,
      week_end: weekEnd,
      generated_at: Math.floor(Date.now() / 1000),
      ai_summary: aiSummary,
      stats_json: JSON.stringify({
        nutrition: nutritionStats,
        workouts: workoutStats,
        recovery: recoveryStats,
        body: bodyStatsData,
      }),
    };

    await insertWeeklySummary(summary);
    return summary;
  } catch (error) {
    console.error("Failed to generate weekly summary:", error);
    return null;
  }
}

/**
 * Get AI summaries for previous weeks (for coach context)
 * Returns up to 3 previous weeks
 */
export async function getPreviousWeeksAISummaries(): Promise<Array<{ week_start: string; week_end: string; summary: string }>> {
  const summaries = await getPreviousWeeklySummaries(3);
  return summaries.map(s => ({
    week_start: s.week_start,
    week_end: s.week_end,
    summary: s.ai_summary,
  }));
}
