import uuid from "react-native-uuid";
import { getLocalDateKey } from "../dates";
import { getDailyNutritionRange } from "../db/queries/nutrition";
import { getSessionsForDateRange } from "../db/queries/workout";
import { getRecoveryLogsForDateRange } from "../db/queries/recovery";
import { getBodyStatsForDateRange } from "../db/queries/body";
import { 
  getMonthlySummary, 
  insertReport, 
  updateReport,
  getWeeklySummariesForMonth,
  getPreviousMonthlySummaries 
} from "../db/queries/reports";
import { generateMonthlySummary } from "../groq/generateCoachResponse";
import type { MonthlyReport } from "../db/schema";

/**
 * Generate or retrieve AI-powered monthly summary
 * Summaries are cached in the database and only generated once per month
 */
export async function getOrGenerateMonthlySummary(month: string): Promise<MonthlyReport | null> {
  // Check if summary already exists
  const existing = await getMonthlySummary(month);
  if (existing && existing.ai_summary) {
    return existing;
  }

  // Don't generate summary for current month (incomplete data)
  const today = new Date();
  const [year, monthNum] = month.split('-').map(Number);
  const monthDate = new Date(year, monthNum - 1, 1);
  
  if (monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth()) {
    return null; // Current month - don't generate yet
  }

  try {
    // Get weekly summaries for this month
    const weeklySummaries = await getWeeklySummariesForMonth(month);
    
    if (weeklySummaries.length === 0) {
      return null; // No data for this month
    }

    // Calculate month date range
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of month
    const startStr = getLocalDateKey(startDate);
    const endStr = endDate.toISOString().split('T')[0];

    // Gather month data
    const [nutrition, workouts, recovery, bodyStats] = await Promise.all([
      getDailyNutritionRange(startStr, endStr),
      getSessionsForDateRange(startStr, endStr),
      getRecoveryLogsForDateRange(startStr, endStr),
      getBodyStatsForDateRange(startStr, endStr),
    ]);

    // Calculate monthly stats
    const nutritionStats = nutrition.length > 0 ? {
      avg_calories: Math.round(nutrition.reduce((sum, d) => sum + d.total_calories, 0) / nutrition.length),
      avg_protein: Math.round(nutrition.reduce((sum, d) => sum + d.total_protein_g, 0) / nutrition.length),
      protein_hit_rate: Math.round((nutrition.filter(d => d.protein_target_met === 1).length / nutrition.length) * 100),
    } : { avg_calories: 0, avg_protein: 0, protein_hit_rate: 0 };

    const workoutStats = {
      total_workouts: workouts.length,
      total_volume_kg: Math.round(workouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0)),
      prs_achieved: 0, // TODO: Count PRs from this month
    };

    const recoveryStats = recovery.length > 0 ? {
      avg_sleep_hr: recovery.reduce((sum, r) => sum + (r.sleep_duration_hr || 0), 0) / recovery.length,
    } : { avg_sleep_hr: 0 };

    const bodyStatsData = bodyStats.length >= 2 ? {
      weight_change_kg: bodyStats[bodyStats.length - 1].weight_kg! - bodyStats[0].weight_kg!,
    } : {};

    // Generate AI summary
    const aiSummary = await generateMonthlySummary({
      month,
      weekly_summaries: weeklySummaries.map(w => ({
        week_start: w.week_start,
        week_end: w.week_end,
        summary: w.ai_summary,
      })),
      stats: {
        ...nutritionStats,
        ...workoutStats,
        ...recoveryStats,
        ...bodyStatsData,
      },
    });

    // Store or update in database
    if (existing) {
      await updateReport(existing.id, {
        ai_summary: aiSummary,
        report_json: JSON.stringify({
          nutrition: nutritionStats,
          workouts: workoutStats,
          recovery: recoveryStats,
          body: bodyStatsData,
        }),
      });
      return { ...existing, ai_summary: aiSummary };
    } else {
      const report: MonthlyReport = {
        id: uuid.v4() as string,
        month,
        generated_at: Math.floor(Date.now() / 1000),
        report_json: JSON.stringify({
          nutrition: nutritionStats,
          workouts: workoutStats,
          recovery: recoveryStats,
          body: bodyStatsData,
        }),
        pdf_path: null,
        ai_summary: aiSummary,
        key_wins: null,
        key_adjustments: null,
      };

      await insertReport(report);
      return report;
    }
  } catch (error) {
    console.error("Failed to generate monthly summary:", error);
    return null;
  }
}

/**
 * Get AI summaries for previous months (for coach context)
 * Returns up to 2 previous months
 */
export async function getPreviousMonthsAISummaries(): Promise<Array<{ month: string; summary: string }>> {
  const summaries = await getPreviousMonthlySummaries(2);
  return summaries
    .filter(s => s.ai_summary)
    .map(s => ({
      month: s.month,
      summary: s.ai_summary!,
    }));
}
