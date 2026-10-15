import { getDailyNutrition } from "../db/queries/nutrition";
import { getSessionsForDateRange } from "../db/queries/workout";
import { getRecoveryLog } from "../db/queries/recovery";
import { getNutritionTargetsForDate } from "../db/queries/nutrition-targets";
import { toLocalDateKey } from "../utils/local-date";
import { evaluateTrainingConsistency, generateCoachRecommendations, type CoachRecommendation, type CoachStateSnapshot } from "./coach-recommendations";
import type { DailyNutrition, WorkoutSession, RecoveryLog } from "../db/schema";
import type { NutritionTargets } from "../nutrition/target-validation";

/** Build a decision snapshot from authoritative persisted values only. */
export function buildUserStateSnapshot(
  date: string,
  nutrition: DailyNutrition | null,
  sessions: WorkoutSession[],
  recovery: RecoveryLog | null,
  targets: NutritionTargets,
): CoachStateSnapshot {
  const training = evaluateTrainingConsistency(sessions);
  return {
    localDate: date,
    nutrition: nutrition ? {
      calories: nutrition.total_calories,
      calorieTarget: targets.calories,
      proteinG: nutrition.total_protein_g,
      proteinTargetG: targets.protein_g,
      explicitlyMarkedComplete: nutrition.is_complete === 1,
    } : null,
    workout: sessions.length ? training : null,
    recovery: recovery ? {
      sleepHours: recovery.sleep_duration_hr,
      energy: recovery.energy_level,
      soreness: recovery.muscle_soreness,
      stress: recovery.stress_level,
    } : null,
  };
}

/** Build recommendations from current persisted facts; never infer a missed session from absence. */
export async function getCurrentCoachRecommendations(date = toLocalDateKey()): Promise<CoachRecommendation[]> {
  const [nutrition, sessions, recovery, targets] = await Promise.all([
    getDailyNutrition(date),
    getSessionsForDateRange(date, date),
    getRecoveryLog(date),
    getNutritionTargetsForDate(date),
  ]);
  return generateCoachRecommendations(buildUserStateSnapshot(date, nutrition, sessions, recovery, targets));
}
