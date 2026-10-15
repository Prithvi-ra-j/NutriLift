import type { BodyStat } from "../db/schema";
import { USER_PROFILE } from "../constants/user-profile";
import { addCalendarDays, differenceInCalendarDays, toLocalDateKey } from "../utils/local-date";

export interface BodyCompositionSummary {
  currentWeight: number | null;
  weightChange7d: number | null;
  weightChange30d: number | null;
  trend: "gaining" | "losing" | "maintaining";
  projectedBFDate: string | null;
  onTrackForGoal: boolean;
}

export function computeBodySummary(
  weightHistory: BodyStat[],
  latestInBody: BodyStat | null
): BodyCompositionSummary {
  if (weightHistory.length === 0) {
    return {
      currentWeight: latestInBody?.weight_kg ?? null,
      weightChange7d: null,
      weightChange30d: null,
      trend: "maintaining",
      projectedBFDate: null,
      onTrackForGoal: false,
    };
  }

  const sorted = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const currentWeight = latest.weight_kg;

  // 7-day change
  const sevenDaysAgo = sorted.find((s) => {
    return differenceInCalendarDays(latest.date, s.date) >= 6;
  });
  const weightChange7d =
    sevenDaysAgo && currentWeight && sevenDaysAgo.weight_kg
      ? currentWeight - sevenDaysAgo.weight_kg
      : null;

  // 30-day change
  const thirtyDaysAgo = sorted[0];
  const weightChange30d =
    thirtyDaysAgo && currentWeight && thirtyDaysAgo.weight_kg
      ? currentWeight - thirtyDaysAgo.weight_kg
      : null;

  // Trend
  let trend: "gaining" | "losing" | "maintaining" = "maintaining";
  if (weightChange7d !== null) {
    if (weightChange7d > 0.3) trend = "gaining";
    else if (weightChange7d < -0.3) trend = "losing";
  }

  // Projection to goal BF%
  let projectedBFDate: string | null = null;
  let onTrackForGoal = false;

  if (latestInBody?.body_fat_pct) {
    const currentBF = latestInBody.body_fat_pct;
    const targetBF = USER_PROFILE.targets.body_fat_pct_dec2026;
    const goalDateKey = "2026-12-31";
    const todayKey = toLocalDateKey();
    const daysToGoal = differenceInCalendarDays(goalDateKey, todayKey);

    // Estimate weekly fat loss rate from weight trend
    const weeklyWeightChange = weightChange7d ?? -0.2; // default conservative
    // Assume ~70% of weight loss is fat when in deficit
    const weeklyFatLossKg = Math.abs(weeklyWeightChange) * 0.7;
    const weeklyFatLossPct =
      latestInBody.weight_kg
        ? (weeklyFatLossKg / latestInBody.weight_kg) * 100
        : 0.1;

    if (weeklyFatLossPct > 0) {
      const weeksNeeded = (currentBF - targetBF) / weeklyFatLossPct;
      projectedBFDate = addCalendarDays(todayKey, Math.trunc(weeksNeeded * 7));
      onTrackForGoal = projectedBFDate <= goalDateKey;
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
