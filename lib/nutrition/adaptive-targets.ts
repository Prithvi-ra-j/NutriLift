export type NutritionGoal = "lose" | "maintain" | "gain";
export type AdaptiveStatus = "ready" | "insufficient-data" | "invalid-data";

export interface CompleteIntakeDay {
  date: string; // YYYY-MM-DD in the user's local calendar
  calories: number;
  complete: boolean;
  quality: "verified" | "reviewed" | "estimated" | "unresolved";
}

export interface WeightMeasurement {
  date: string; // YYYY-MM-DD in the user's local calendar
  weightKg: number;
}

export interface AdaptiveTargetInput {
  intakeDays: CompleteIntakeDay[];
  weights: WeightMeasurement[];
  currentTargetKcal: number;
  goal: NutritionGoal;
}

export interface AdaptiveTargetResult {
  status: AdaptiveStatus;
  reason: string;
  maintenanceKcal: number | null;
  suggestedTargetKcal: number | null;
  averageIntakeKcal: number | null;
  weightChangeKgPerWeek: number | null;
  qualifiedIntakeDays: number;
  qualifiedWeighIns: number;
  changeFromCurrentKcal: number | null;
  algorithmVersion: 1;
}

const MIN_SPAN_DAYS = 13;
const MIN_COMPLETE_DAYS = 10;
const MIN_WEIGH_INS = 5;
const KCAL_PER_KG = 7700;
const MAX_CHANGE_KCAL = 150;
const MIN_TARGET_KCAL = 1200;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function invalid(reason: string, input: AdaptiveTargetInput): AdaptiveTargetResult {
  return {
    status: "invalid-data",
    reason,
    maintenanceKcal: null,
    suggestedTargetKcal: null,
    averageIntakeKcal: null,
    weightChangeKgPerWeek: null,
    qualifiedIntakeDays: 0,
    qualifiedWeighIns: 0,
    changeFromCurrentKcal: null,
    algorithmVersion: 1,
  };
}

/**
 * Produces an explainable recommendation, never writes to storage or auto-applies it.
 * Only complete, reviewed/verified intake days qualify. Weight trend is estimated by
 * median pairwise slope to reduce sensitivity to a single noisy measurement.
 */
export function estimateAdaptiveTarget(input: AdaptiveTargetInput): AdaptiveTargetResult {
  const { currentTargetKcal, goal } = input;
  if (!Number.isFinite(currentTargetKcal) || currentTargetKcal < MIN_TARGET_KCAL || currentTargetKcal > 6000) {
    return invalid("Current calorie target is outside the supported range.", input);
  }

  const intakeByDate = new Map<string, CompleteIntakeDay>();
  for (const day of input.intakeDays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
    if (!day.complete || !["verified", "reviewed"].includes(day.quality)) continue;
    if (!Number.isFinite(day.calories) || day.calories < 500 || day.calories > 8000) continue;
    intakeByDate.set(day.date, day);
  }
  const intake = [...intakeByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const weightsByDate = new Map<string, number>();
  for (const item of input.weights) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
    if (!Number.isFinite(item.weightKg) || item.weightKg < 25 || item.weightKg > 350) continue;
    weightsByDate.set(item.date, item.weightKg);
  }
  const weights = [...weightsByDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const span = intake.length >= 2
    ? Math.round((Date.parse(`${intake[intake.length - 1].date}T12:00:00Z`) - Date.parse(`${intake[0].date}T12:00:00Z`)) / 86_400_000)
    : 0;

  const base: Omit<AdaptiveTargetResult, "status" | "reason" | "maintenanceKcal" | "suggestedTargetKcal" | "averageIntakeKcal" | "weightChangeKgPerWeek" | "changeFromCurrentKcal"> = {
    qualifiedIntakeDays: intake.length,
    qualifiedWeighIns: weights.length,
    algorithmVersion: 1,
  };
  if (span < MIN_SPAN_DAYS || intake.length < MIN_COMPLETE_DAYS || weights.length < MIN_WEIGH_INS) {
    return {
      ...base,
      status: "insufficient-data",
      reason: `Need at least 14 days of history, ${MIN_COMPLETE_DAYS} complete reviewed intake days, and ${MIN_WEIGH_INS} valid weigh-ins. Keep logging; no target change is recommended yet.`,
      maintenanceKcal: null,
      suggestedTargetKcal: null,
      averageIntakeKcal: intake.length ? Math.round(intake.reduce((sum, day) => sum + day.calories, 0) / intake.length) : null,
      weightChangeKgPerWeek: null,
      changeFromCurrentKcal: null,
    };
  }

  const slopes: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    for (let j = i + 1; j < weights.length; j++) {
      const days = (Date.parse(`${weights[j].date}T12:00:00Z`) - Date.parse(`${weights[i].date}T12:00:00Z`)) / 86_400_000;
      if (days >= 4) slopes.push(((weights[j].weightKg - weights[i].weightKg) / days) * 7);
    }
  }
  if (!slopes.length) {
    return {
      ...base, status: "insufficient-data", reason: "Weigh-ins are too close together to estimate a reliable trend.",
      maintenanceKcal: null, suggestedTargetKcal: null,
      averageIntakeKcal: Math.round(intake.reduce((sum, day) => sum + day.calories, 0) / intake.length),
      weightChangeKgPerWeek: null, changeFromCurrentKcal: null,
    };
  }

  const weightChangeKgPerWeek = median(slopes);
  const averageIntakeKcal = intake.reduce((sum, day) => sum + day.calories, 0) / intake.length;
  const rawMaintenance = averageIntakeKcal - (weightChangeKgPerWeek * KCAL_PER_KG) / 7;
  if (!Number.isFinite(rawMaintenance) || rawMaintenance < MIN_TARGET_KCAL || rawMaintenance > 6000) {
    return { ...base, status: "invalid-data", reason: "The estimated maintenance calories are outside the supported range; review intake and weigh-ins.", maintenanceKcal: null, suggestedTargetKcal: null, averageIntakeKcal: Math.round(averageIntakeKcal), weightChangeKgPerWeek, changeFromCurrentKcal: null };
  }

  const desiredOffset = goal === "lose" ? -300 : goal === "gain" ? 200 : 0;
  const unboundedTarget = rawMaintenance + desiredOffset;
  const boundedDelta = Math.max(-MAX_CHANGE_KCAL, Math.min(MAX_CHANGE_KCAL, unboundedTarget - currentTargetKcal));
  const suggestedTargetKcal = Math.round(Math.max(MIN_TARGET_KCAL, Math.min(6000, currentTargetKcal + boundedDelta)) / 50) * 50;

  return {
    ...base,
    status: "ready",
    reason: `Estimated from ${intake.length} complete reviewed intake days and ${weights.length} weigh-ins. This is a recommendation only; review before applying. Updates are capped at ±${MAX_CHANGE_KCAL} kcal per review.`,
    maintenanceKcal: Math.round(rawMaintenance / 50) * 50,
    suggestedTargetKcal,
    averageIntakeKcal: Math.round(averageIntakeKcal),
    weightChangeKgPerWeek: Math.round(weightChangeKgPerWeek * 100) / 100,
    changeFromCurrentKcal: suggestedTargetKcal - currentTargetKcal,
  };
}
