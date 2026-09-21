import uuid from "react-native-uuid";
import { getLocalDateKey } from "../dates";
import { 
  getQuarterlySummary, 
  insertQuarterlySummary, 
  updateQuarterlySummary,
  getMonthlySummariesForQuarter,
  getPreviousQuarterlySummaries 
} from "../db/queries/reports";
import { generateQuarterlySummary } from "../groq/generateCoachResponse";
import type { QuarterlySummary } from "../db/schema";

/**
 * Generate or retrieve AI-powered quarterly summary
 * Summaries are cached in the database and only generated once per quarter
 */
export async function getOrGenerateQuarterlySummary(quarter: string): Promise<QuarterlySummary | null> {
  // quarter format: YYYY-Q1, YYYY-Q2, etc.
  
  // Check if summary already exists
  const existing = await getQuarterlySummary(quarter);
  if (existing) {
    return existing;
  }

  // Don't generate summary for current quarter (incomplete data)
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
  const currentYear = today.getFullYear();
  const [year, q] = quarter.split('-');
  const quarterNum = parseInt(q.replace('Q', ''));
  
  if (parseInt(year) === currentYear && quarterNum === currentQuarter) {
    return null; // Current quarter - don't generate yet
  }

  try {
    // Get monthly summaries for this quarter
    const monthlySummaries = await getMonthlySummariesForQuarter(quarter);
    
    if (monthlySummaries.length === 0) {
      return null; // No data for this quarter
    }

    // Calculate quarter date range
    const startMonth = (quarterNum - 1) * 3 + 1;
    const startDate = new Date(parseInt(year), startMonth - 1, 1);
    const endDate = new Date(parseInt(year), startMonth + 2, 0); // Last day of 3rd month
    
    // Aggregate stats from monthly reports
    const allStats = monthlySummaries.map(m => JSON.parse(m.report_json));
    
    const aggregatedStats = {
      total_workouts: allStats.reduce((sum, s) => sum + (s.workouts?.total_workouts || 0), 0),
      total_volume_kg: allStats.reduce((sum, s) => sum + (s.workouts?.total_volume_kg || 0), 0),
      prs_achieved: allStats.reduce((sum, s) => sum + (s.workouts?.prs_achieved || 0), 0),
      weight_change_kg: allStats.reduce((sum, s) => sum + (s.body?.weight_change_kg || 0), 0),
      avg_protein_adherence: Math.round(
        allStats.reduce((sum, s) => sum + (s.nutrition?.protein_hit_rate || 0), 0) / allStats.length
      ),
    };

    // Generate AI summary
    const aiSummary = await generateQuarterlySummary({
      quarter,
      start_date: getLocalDateKey(startDate),
      end_date: getLocalDateKey(endDate),
      monthly_summaries: monthlySummaries
        .filter(m => m.ai_summary)
        .map(m => ({
          month: m.month,
          summary: m.ai_summary!,
        })),
      stats: aggregatedStats,
    });

    // Store in database
    const summary: QuarterlySummary = {
      id: uuid.v4() as string,
      quarter,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      generated_at: Math.floor(Date.now() / 1000),
      ai_summary: aiSummary,
      stats_json: JSON.stringify(aggregatedStats),
    };

    await insertQuarterlySummary(summary);
    return summary;
  } catch (error) {
    console.error("Failed to generate quarterly summary:", error);
    return null;
  }
}

/**
 * Get AI summaries for previous quarters (for coach context)
 * Returns up to 1 previous quarter
 */
export async function getPreviousQuartersAISummaries(): Promise<Array<{ quarter: string; summary: string }>> {
  const summaries = await getPreviousQuarterlySummaries(1);
  return summaries.map(s => ({
    quarter: s.quarter,
    summary: s.ai_summary,
  }));
}
