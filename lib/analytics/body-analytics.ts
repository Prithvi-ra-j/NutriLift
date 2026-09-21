import type { BodyStat } from "../db/schema";
import { getTodayKey, getDateDaysAgo, getLocalDateKey, parseDateKey } from "../dates";

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
  latestInBody: BodyStat | null,
  targetBodyFat?: number | null
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
    const diff =
      (parseDateKey(latest.date).getTime() - parseDateKey(s.date).getTime()) /
      (1000 * 60 * 60 * 24);
    return diff >= 6;
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

  if (latestInBody?.body_fat_pct && Number(targetBodyFat) > 0) {
    const currentBF = latestInBody.body_fat_pct;
    const targetBF = Number(targetBodyFat);
    const goalDate = parseDateKey("2026-12-31");
    const today = new Date();
    const daysToGoal = (goalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

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
      const projectedDate = new Date(today);
      projectedDate.setDate(today.getDate() + weeksNeeded * 7);
      projectedBFDate = getLocalDateKey(projectedDate);
      onTrackForGoal = projectedDate <= goalDate;
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
