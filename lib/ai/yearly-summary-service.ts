import uuid from "react-native-uuid";
import { 
  getYearlySummary, 
  insertYearlySummary, 
  updateYearlySummary,
  getQuarterlySummariesForYear,
  getPreviousYearlySummaries 
} from "../db/queries/reports";
import { getAllPRs } from "../db/queries/workout";
import { getBodyStatsForDateRange } from "../db/queries/body";
import { generateYearlySummary } from "../groq/generateCoachResponse";
import type { YearlySummary } from "../db/schema";

/**
 * Generate or retrieve AI-powered yearly summary
 * Summaries are cached in the database and only generated once per year
 */
export async function getOrGenerateYearlySummary(year: string): Promise<YearlySummary | null> {
  // Check if summary already exists
  const existing = await getYearlySummary(year);
  if (existing) {
    return existing;
  }

  // Don't generate summary for current year (incomplete data)
  const currentYear = new Date().getFullYear();
  if (parseInt(year) === currentYear) {
    return null; // Current year - don't generate yet
  }

  try {
    // Get quarterly summaries for this year
    const quarterlySummaries = await getQuarterlySummariesForYear(year);
    
    if (quarterlySummaries.length === 0) {
      return null; // No data for this year
    }

    // Get body stats for year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const bodyStats = await getBodyStatsForDateRange(startDate, endDate);
    
    // Get PRs (we'll need to filter by year in a real implementation)
    const allPRs = await getAllPRs();
    
    // Calculate starting and ending weights
    const startingWeight = bodyStats.length > 0 ? bodyStats[0].weight_kg : 0;
    const endingWeight = bodyStats.length > 0 ? bodyStats[bodyStats.length - 1].weight_kg : 0;
    
    // Aggregate stats from quarterly summaries
    const allStats = quarterlySummaries.map(q => JSON.parse(q.stats_json));
    
    const aggregatedStats = {
      starting_weight_kg: startingWeight || 0,
      ending_weight_kg: endingWeight || 0,
      total_workouts: allStats.reduce((sum, s) => sum + (s.total_workouts || 0), 0),
      total_volume_kg: allStats.reduce((sum, s) => sum + (s.total_volume_kg || 0), 0),
      prs_achieved: allStats.reduce((sum, s) => sum + (s.prs_achieved || 0), 0),
      major_lifts: {
        // TODO: Get actual start/end values for major lifts from PR history
        bench_start: 0,
        bench_end: allPRs.find(pr => pr.exercise_name.toLowerCase().includes('bench'))?.best_weight_kg || 0,
        squat_start: 0,
        squat_end: allPRs.find(pr => pr.exercise_name.toLowerCase().includes('squat'))?.best_weight_kg || 0,
        deadlift_start: 0,
        deadlift_end: allPRs.find(pr => pr.exercise_name.toLowerCase().includes('deadlift'))?.best_weight_kg || 0,
      },
    };

    // Generate AI summary
    const aiSummary = await generateYearlySummary({
      year,
      quarterly_summaries: quarterlySummaries.map(q => ({
        quarter: q.quarter,
        summary: q.ai_summary,
      })),
      stats: aggregatedStats,
    });

    // Store in database
    const summary: YearlySummary = {
      id: uuid.v4() as string,
      year,
      generated_at: Math.floor(Date.now() / 1000),
      ai_summary: aiSummary,
      transformation_story: aiSummary, // Same as ai_summary for now
      stats_json: JSON.stringify(aggregatedStats),
    };

    await insertYearlySummary(summary);
    return summary;
  } catch (error) {
    console.error("Failed to generate yearly summary:", error);
    return null;
  }
}

/**
 * Get AI summaries for previous years (for coach context)
 * Returns up to 5 previous years
 */
export async function getPreviousYearsAISummaries(): Promise<Array<{ year: string; summary: string }>> {
  const summaries = await getPreviousYearlySummaries(5);
  return summaries.map(s => ({
    year: s.year,
    summary: s.ai_summary,
  }));
}
