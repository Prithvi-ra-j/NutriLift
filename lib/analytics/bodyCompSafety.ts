import type { BodyStat, MeasurementTimeOfDay } from "../data/db/schema";
import { daysBetween } from "../time/localDate";

export function getEligibleBodyCompTimeOfDay(
  stats: Pick<BodyStat, "date" | "measurement_time_of_day">[],
): MeasurementTimeOfDay | null {
  const groups = new Map<MeasurementTimeOfDay, Set<string>>();
  for (const stat of stats) {
    const timeOfDay = stat.measurement_time_of_day;
    if (!timeOfDay) continue;
    const dates = groups.get(timeOfDay) ?? new Set<string>();
    dates.add(stat.date);
    groups.set(timeOfDay, dates);
  }

  for (const [timeOfDay, uniqueDates] of groups) {
    const dates = [...uniqueDates].sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (dates.length >= 3 && first && last && daysBetween(first, last) >= 14) {
      return timeOfDay;
    }
  }
  return null;
}

export function canCommentOnBodyComp(
  stats: Pick<BodyStat, "date" | "measurement_time_of_day">[],
): boolean {
  return getEligibleBodyCompTimeOfDay(stats) !== null;
}
