import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { bodyStats, dailyNutrition, personalRecords, recoveryLogs, workoutSessions } from "../../db/schema";
import { fromLocalDateKey } from "../../utils/local-date";

export type NutriLiftSourceType = "workout_session" | "daily_nutrition" | "body_stat" | "personal_record" | "recovery_metric";

export interface NutriLiftSourceReference {
  entityType: NutriLiftSourceType;
  entityId: string;
  date?: string;
  metric?: string;
}

export interface ResolvedSourceEntity extends NutriLiftSourceReference {
  externalId: string;
  exists: boolean;
  current: boolean;
  updatedAt: string | null;
  deepLink: string | null;
  reason?: "source_missing" | "metric_cleared";
}

/** Parse only NutriLift's documented stable external-id forms. */
export function parseNutriLiftExternalId(externalId: string): NutriLiftSourceReference | null {
  if (typeof externalId !== "string" || !externalId.startsWith("nutrilift:")) return null;
  const parts = externalId.split(":");
  try {
    if (parts[1] === "workout_session" && parts.length === 3 && parts[2]) {
      return { entityType: "workout_session", entityId: parts[2] };
    }
    if (parts[1] === "daily_nutrition" && parts.length === 3) {
      fromLocalDateKey(parts[2]);
      return { entityType: "daily_nutrition", entityId: parts[2], date: parts[2] };
    }
    if (parts[1] === "body_stat" && parts.length === 3 && parts[2]) {
      return { entityType: "body_stat", entityId: parts[2] };
    }
    if (parts[1] === "personal_record" && parts.length === 4) {
      fromLocalDateKey(parts[3]);
      return { entityType: "personal_record", entityId: decodeURIComponent(parts[2]), date: parts[3] };
    }
    if (parts[1] === "recovery" && parts.length === 4 && parts[2]) {
      fromLocalDateKey(parts[3]);
      return { entityType: "recovery_metric", entityId: parts[3], date: parts[3], metric: parts[2] };
    }
  } catch {
    return null;
  }
  return null;
}

/** Return only app routes that are supported by NutriLift's navigation. */
export function getSourceDeepLink(reference: NutriLiftSourceReference): string | null {
  const date = reference.date;
  if (reference.entityType === "workout_session") {
    return date ? `/workout?date=${encodeURIComponent(date)}` : "/workout";
  }
  if (reference.entityType === "daily_nutrition") {
    if (!date) return null;
    try { fromLocalDateKey(date); } catch { return null; }
    return `/nutrition?date=${encodeURIComponent(date)}`;
  }
  if (reference.entityType === "body_stat") {
    if (!date) return null;
    try { fromLocalDateKey(date); } catch { return null; }
    return `/progress?section=body&date=${encodeURIComponent(date)}`;
  }
  if (reference.entityType === "personal_record") {
    if (!date) return null;
    try { fromLocalDateKey(date); } catch { return null; }
    return `/workout?date=${encodeURIComponent(date)}`;
  }
  if (reference.entityType === "recovery_metric") return "/more?section=recovery";
  return null;
}

export async function resolveSourceEntity(externalId: string): Promise<ResolvedSourceEntity | null> {
  const reference = parseNutriLiftExternalId(externalId);
  if (!reference) return null;
  let row: any;
  let current = true;
  if (reference.entityType === "workout_session") {
    row = (await db.select().from(workoutSessions).where(eq(workoutSessions.id, reference.entityId)).limit(1))[0];
  } else if (reference.entityType === "daily_nutrition") {
    row = (await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, reference.entityId)).limit(1))[0];
  } else if (reference.entityType === "body_stat") {
    row = (await db.select().from(bodyStats).where(eq(bodyStats.id, reference.entityId)).limit(1))[0];
  } else if (reference.entityType === "personal_record") {
    row = (await db.select().from(personalRecords).where(and(
      eq(personalRecords.exercise_name, reference.entityId),
      eq(personalRecords.achieved_date, reference.date!),
    )).limit(1))[0];
  } else {
    row = (await db.select().from(recoveryLogs).where(eq(recoveryLogs.date, reference.date!)).limit(1))[0];
    const metricFields: Record<string, string> = {
      sleep: "sleep_duration_hr", hrv: "hrv", energy: "energy_level",
      soreness: "muscle_soreness", stress: "stress_level",
    };
    const field = reference.metric ? metricFields[reference.metric] : undefined;
    if (!field) return null;
    current = Boolean(row && row[field] !== null && row[field] !== undefined);
  }
  const exists = Boolean(row);
  return {
    ...reference,
    externalId,
    exists,
    current: exists && current,
    updatedAt: row?.updated_at ? String(row.updated_at) : row?.created_at ? String(row.created_at) : null,
    deepLink: exists ? getSourceDeepLink({ ...reference, date: reference.date ?? (row?.date ? String(row.date) : undefined) }) : null,
    ...(!exists ? { reason: "source_missing" as const } : exists && !current ? { reason: "metric_cleared" as const } : {}),
  };
}
