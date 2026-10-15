import { getDailyNutrition } from "../db/queries/nutrition";
import { getSessionsForDateRange } from "../db/queries/workout";
import { getRecoveryLog } from "../db/queries/recovery";
import { getNutritionTargetsForDate } from "../db/queries/nutrition-targets";
import { toLocalDateKey } from "../utils/local-date";
import { generateCoachRecommendations, type CoachRecommendation } from "./coach-recommendations";

/** Build recommendations from current persisted facts; never infer a missed session from absence. */
export async function getCurrentCoachRecommendations(date = toLocalDateKey()): Promise<CoachRecommendation[]> {
  const [nutrition, sessions, recovery, targets] = await Promise.all([
    getDailyNutrition(date),
    getSessionsForDateRange(date, date),
    getRecoveryLog(date),
    getNutritionTargetsForDate(date),
  ]);
  return generateCoachRecommendations({
    localDate: date,
    nutrition: nutrition ? {
      calories: nutrition.total_calories,
      calorieTarget: targets.calories,
      proteinG: nutrition.total_protein_g,
      proteinTargetG: targets.protein_g,
      explicitlyMarkedComplete: nutrition.is_complete === 1,
    } : null,
    workout: sessions.length ? {
      plannedToday: sessions.some((session) => session.status === "planned"),
      completedToday: sessions.some((session) => session.status === "completed"),
    } : null,
    recovery: recovery ? {
      sleepHours: recovery.sleep_duration_hr,
      energy: recovery.energy_level,
      soreness: recovery.muscle_soreness,
      stress: recovery.stress_level,
    } : null,
  });
}
