import { inRead } from "../db/tx";
import { getProfile, getTargetsForDate } from "../profile";
import { getDailyNutrition, getDailyNutritionRange } from "./nutrition";
import { getRecoveryLog } from "./recovery";
import { getSessionsForDate } from "./workout";
import { getTrackingPauseStatus } from "../../pauseMode";
import { addDays } from "../../time/localDate";

export async function getHomeSummary(date: string) {
  return inRead(async () => ({
    nutrition: await getDailyNutrition(date),
    sessions: await getSessionsForDate(date),
    last7Days: await getDailyNutritionRange(addDays(date, -6), date),
    recovery: await getRecoveryLog(date),
    profile: await getProfile(),
    targets: await getTargetsForDate(date),
    trackingPause: await getTrackingPauseStatus(date),
  }));
}
