import type { BodyStat } from "../db/schema";
import { addDays } from "../time/localDate";

type BodyValueField = "weight_kg" | "body_fat_pct";

export function rollingBodyAverage(
  stats: (Pick<BodyStat, "date"> & Partial<Pick<BodyStat, BodyValueField>>)[],
  field: BodyValueField,
  endDate: string,
): number | null {
  const startDate = addDays(endDate, -6);
  const values = stats
    .filter((stat) => stat.date >= startDate && stat.date <= endDate)
    .map((stat) => stat[field])
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
