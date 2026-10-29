import { inRead } from "../db/tx";
import { getTargetsForDate } from "../profile";
import { getAllPRs } from "./workout";
import { getAllInBodyRecords, getBodyStatsForDateRange } from "./body";
import { getDailyNutritionRange } from "./nutrition";
import { getRecoveryLogsForDateRange } from "./recovery";

export type ProgressOverviewRange = {
  selectedDate: string;
  weightStartDate: string;
  nutritionStartDate: string;
  recoveryStartDate: string;
  endDate: string;
};

export async function getProgressOverview(range: ProgressOverviewRange) {
  return inRead(async () => {
    const bodyStats = await getBodyStatsForDateRange(
      range.weightStartDate,
      range.endDate,
    );
    return {
      prs: await getAllPRs(),
      weightHistory: bodyStats.filter((stat) => stat.type === "weight"),
      inBodyRecords: await getAllInBodyRecords(),
      nutritionHistory: await getDailyNutritionRange(
        range.nutritionStartDate,
        range.endDate,
      ),
      recoveryLogs: await getRecoveryLogsForDateRange(
        range.recoveryStartDate,
        range.endDate,
      ),
      targets: await getTargetsForDate(range.selectedDate),
    };
  });
}
