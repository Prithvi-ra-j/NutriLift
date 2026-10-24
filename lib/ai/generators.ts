import { AiError } from "./gateway";
import { MonthlyReportSchema, SummarySchema } from "./schemas";
import type { MonthlyReportResult } from "./schemas";
import type {
  BodyStat,
  DailyNutrition,
  PersonalRecord,
  RecoveryLog,
  UserProfile,
  WorkoutSession,
} from "../db/schema";
import { requestStructured } from "./structured";
import { monthlyPrompt } from "./prompts/monthly";
import { quarterlyPrompt } from "./prompts/quarterly";
import { weeklyPrompt } from "./prompts/weekly";
import { yearlyPrompt } from "./prompts/yearly";
import { getAiContextPreferences, getMinimumCalorieFloor } from "./preferences";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "./riskPhrases";
import { applyCoachGuardrails } from "./guardrails";
import { getOrGenerateAiSummary } from "./summaryCache";
import { isFeatureEnabled, type FeatureFlag } from "../featureFlags";

type MonthlyReportData = {
  month: string;
  nutrition_logs: DailyNutrition[];
  workout_sessions: WorkoutSession[];
  personal_records: PersonalRecord[];
  inbody_records: BodyStat[];
  weight_history: BodyStat[];
  recovery_logs: RecoveryLog[];
  supplement_adherence: Record<string, number>;
};

function summaryPrompt(
  prompt: { id: string; version: number; build: (context: unknown) => string },
  context: unknown,
) {
  return {
    id: prompt.id,
    version: prompt.version,
    build: () => prompt.build(context),
  };
}

async function generateSummary(
  prompt: { id: string; version: number; build: (context: unknown) => string },
  context: unknown,
): Promise<string> {
  const result = await requestStructured(
    summaryPrompt(prompt, context),
    "Return a concise, factual summary.",
    SummarySchema,
  );
  return applyCoachGuardrails(result.summary, await getMinimumCalorieFloor());
}

export function generateWeeklySummary(context: unknown): Promise<string> {
  return generateEnabledSummary("weeklySummaries", weeklyPrompt, context);
}

export function generateMonthlySummary(context: unknown): Promise<string> {
  return generateEnabledSummary("monthlySummaries", monthlyPrompt, context);
}

export function generateQuarterlySummary(context: unknown): Promise<string> {
  return generateEnabledSummary("quarterlySummaries", quarterlyPrompt, context);
}

export function generateYearlySummary(context: unknown): Promise<string> {
  return generateEnabledSummary("yearlySummaries", yearlyPrompt, context);
}

async function generateEnabledSummary(
  flag: FeatureFlag,
  prompt: Parameters<typeof generateSummary>[0],
  context: unknown,
): Promise<string> {
  if (!(await isFeatureEnabled(flag))) {
    throw new Error(`The ${flag} feature is disabled in app settings.`);
  }
  return generateSummary(prompt, context);
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function trend(first: number, second: number): "increasing" | "stable" | "decreasing" {
  const delta = second - first;
  if (Math.abs(delta) <= Math.max(first, second) * 0.05) return "stable";
  return delta > 0 ? "increasing" : "decreasing";
}

function boundedSection<T>(section: T, maxCharacters = 2_000): T | string {
  const serialized = JSON.stringify(section);
  if (serialized.length <= maxCharacters) return section;
  return serialized.slice(0, maxCharacters);
}

export async function generateMonthlyReport(
  profile: UserProfile | null,
  data: MonthlyReportData,
): Promise<MonthlyReportResult> {
  const preferences = await getAiContextPreferences();
  const minimumCalories = await getMinimumCalorieFloor();
  const nutrition = {
    days_logged: data.nutrition_logs.length,
    avg_calories: Math.round(average(data.nutrition_logs.map((day) => day.total_calories))),
    avg_protein_g: Math.round(average(data.nutrition_logs.map((day) => day.total_protein_g))),
    adherence_pct: Math.round(average(data.nutrition_logs.map((day) => day.adherence_score ?? 0))),
    protein_hit_rate: Math.round(
      average(data.nutrition_logs.map((day) => day.protein_target_met === 1 ? 100 : 0)),
    ),
  };
  const sortedSessions = [...data.workout_sessions].sort((a, b) => a.date.localeCompare(b.date));
  const midpoint = Math.ceil(sortedSessions.length / 2);
  const firstHalfVolume = average(
    sortedSessions.slice(0, midpoint).map((session) => session.total_volume_kg ?? 0),
  );
  const secondHalfVolume = average(
    sortedSessions.slice(midpoint).map((session) => session.total_volume_kg ?? 0),
  );
  const strength = {
    total_sessions: sortedSessions.length,
    total_volume_kg: Math.round(sortedSessions.reduce(
      (total, session) => total + (session.total_volume_kg ?? 0),
      0,
    )),
    prs_hit: data.personal_records.filter((record) => record.achieved_date.startsWith(data.month)).length,
    volume_trend: trend(firstHalfVolume, secondHalfVolume),
  };
  const recovery = {
    average_sleep_hours: average(
      data.recovery_logs
        .map((record) => record.sleep_duration_hr)
        .filter((value): value is number => value !== null),
    ),
    supplement_adherence_pct: Math.round(average(Object.values(data.supplement_adherence))),
  };
  const sortedWeights = [...data.weight_history]
    .filter((record) => record.weight_kg !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const body = preferences.includeBodyMeasurements
    ? {
      weight_change_kg: sortedWeights.length > 1
        ? Number((sortedWeights[sortedWeights.length - 1].weight_kg! - sortedWeights[0].weight_kg!).toFixed(1))
        : null,
      inbody_readings: data.inbody_records.length,
    }
    : null;
  const notes = preferences.includeInjuriesAndNotes ? profile?.coach_notes ?? null : null;
  if (notes && containsEatingSafetyRisk(notes)) {
    throw new AiError("safety", AI_SAFETY_RESPONSE);
  }

  const context = {
    month: data.month,
    nutrition: boundedSection(nutrition),
    strength: boundedSection(strength),
    recovery: boundedSection(recovery),
    body: boundedSection(body),
    coach_notes: notes,
    minimum_calorie_floor: minimumCalories,
  };
  const prompt = summaryPrompt(monthlyPrompt, context);
  const cachedReport = await getOrGenerateAiSummary(
    `monthly-report:${data.month}`,
    `${monthlyPrompt.id}@${monthlyPrompt.version}`,
    context,
    async () => JSON.stringify(await requestStructured(
      prompt,
      "Create the report using only the supplied aggregates. Use null for unavailable measurements.",
      MonthlyReportSchema,
    )),
  );
  const report = MonthlyReportSchema.parse(JSON.parse(cachedReport) as unknown);
  const guard = (value: string) => applyCoachGuardrails(value, minimumCalories);
  return {
    ...report,
    executive_summary: {
      ...report.executive_summary,
      headline: guard(report.executive_summary.headline),
      top_3_wins: report.executive_summary.top_3_wins.map(guard),
      top_3_areas_to_improve: report.executive_summary.top_3_areas_to_improve.map(guard),
    },
    nutrition: {
      ...report.nutrition,
      key_insights: report.nutrition.key_insights.map(guard),
    },
    strength: {
      ...report.strength,
      key_insights: report.strength.key_insights.map(guard),
    },
    body_composition: {
      ...report.body_composition,
      key_insights: report.body_composition.key_insights.map(guard),
    },
    recovery: {
      ...report.recovery,
      key_insights: report.recovery.key_insights.map(guard),
    },
    next_month_plan: {
      nutrition_adjustments: report.next_month_plan.nutrition_adjustments.map(guard),
      training_adjustments: report.next_month_plan.training_adjustments.map(guard),
      recovery_focus: report.next_month_plan.recovery_focus.map(guard),
    },
    ai_narrative: guard(report.ai_narrative),
  };
}
