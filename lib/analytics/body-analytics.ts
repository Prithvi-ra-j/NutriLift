import type { BodyStat } from "../db/schema";
import { addCalendarDays, differenceInCalendarDays, toLocalDateKey } from "../utils/local-date";

export interface BodyCompositionSummary {
  currentWeight: number | null;
  weightChange7d: number | null;
  weightChange30d: number | null;
  trend: "gaining" | "losing" | "maintaining" | "unknown";
  projectedBFDate: string | null;
  onTrackForGoal: boolean;
}

export interface BodyCompositionGoal {
  targetBodyFatPct: number;
  goalDate: string;
}

export function computeBodySummary(
  weightHistory: BodyStat[],
  latestInBody: BodyStat | null,
  goal: BodyCompositionGoal | null = null,
): BodyCompositionSummary {
  if (weightHistory.length === 0) {
    return {
      currentWeight: latestInBody?.weight_kg ?? null,
      weightChange7d: null,
      weightChange30d: null,
      trend: "unknown",
      projectedBFDate: null,
      onTrackForGoal: false,
    };
  }

  const sorted = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const currentWeight = latest.weight_kg;

  // Compare against the closest measurement near each requested window.
  // Sparse histories remain unknown instead of borrowing a much older record.
  const closestPrior = (targetDays: number, minimumDays: number) => {
    const candidates = sorted.filter((stat) => {
      const elapsed = differenceInCalendarDays(latest.date, stat.date);
      return elapsed >= minimumDays && stat.weight_kg != null;
    });
    return candidates.sort((a, b) => {
      const da = differenceInCalendarDays(latest.date, a.date);
      const db = differenceInCalendarDays(latest.date, b.date);
      return Math.abs(da - targetDays) - Math.abs(db - targetDays);
    })[0] ?? null;
  };

  const sevenDaysAgo = closestPrior(7, 6);
  const thirtyDaysAgo = closestPrior(30, 27);
  const weightChange7d =
    currentWeight != null && sevenDaysAgo?.weight_kg != null
      ? currentWeight - sevenDaysAgo.weight_kg
      : null;
  const weightChange30d =
    currentWeight != null && thirtyDaysAgo?.weight_kg != null
      ? currentWeight - thirtyDaysAgo.weight_kg
      : null;

  let trend: "gaining" | "losing" | "maintaining" | "unknown" = "unknown";
  if (weightChange7d !== null) {
    trend = "maintaining";
    if (weightChange7d > 0.3) trend = "gaining";
    else if (weightChange7d < -0.3) trend = "losing";
  }

  // Projection is shown only with an explicit user goal and observed downward
  // weight trend. Never invent a default loss rate or a hard-coded deadline.
  let projectedBFDate: string | null = null;
  let onTrackForGoal = false;
  const currentBF = latestInBody?.body_fat_pct;
  const currentMeasurementWeight = latestInBody?.weight_kg;
  if (
    goal &&
    currentBF != null &&
    currentMeasurementWeight != null &&
    currentMeasurementWeight > 0 &&
    weightChange7d != null &&
    weightChange7d < 0
  ) {
    const todayKey = toLocalDateKey();
    const daysToGoal = differenceInCalendarDays(goal.goalDate, todayKey);
    const weeklyFatLossKg = -weightChange7d * 0.7;
    const weeklyFatLossPct = (weeklyFatLossKg / currentMeasurementWeight) * 100;
    if (daysToGoal >= 0 && weeklyFatLossPct > 0 && currentBF > goal.targetBodyFatPct) {
      const weeksNeeded = (currentBF - goal.targetBodyFatPct) / weeklyFatLossPct;
      projectedBFDate = addCalendarDays(todayKey, Math.ceil(weeksNeeded * 7));
      onTrackForGoal = projectedBFDate <= goal.goalDate;
    }
  }

  return {
    currentWeight: currentWeight ?? null,
    weightChange7d,
    weightChange30d,
    trend,
    projectedBFDate,
    onTrackForGoal,
  };
}
