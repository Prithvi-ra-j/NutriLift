import { z } from "zod";
import type { SupportedRecordType, SyncRecord } from "../integrations/life-os/exportSchema";

const rowPayload = z.object({
  id: z.string().min(1),
  row: z.record(z.string(), z.unknown()),
  session_id: z.string().optional(),
  exercise_log_id: z.string().optional(),
  dayType: z.string().nullable().optional(),
  durationMin: z.number().nullable().optional(),
  totalVolumeKg: z.number().nullable().optional(),
  rpe: z.number().nullable().optional(),
  exerciseName: z.string().optional(),
  bestWeightKg: z.number().nullable().optional(),
  bestRepsAtBestWeight: z.number().nullable().optional(),
  best1rmEstimated: z.number().nullable().optional(),
  bestVolumeSingleSet: z.number().nullable().optional(),
  previousBestKg: z.number().nullable().optional(),
  improvementPct: z.number().nullable().optional(),
  totalCalories: z.number().nullable().optional(),
  totalProteinG: z.number().nullable().optional(),
  totalCarbsG: z.number().nullable().optional(),
  totalFatG: z.number().nullable().optional(),
  proteinTargetMet: z.boolean().optional(),
  calorieTargetMet: z.boolean().optional(),
  adherenceScore: z.number().nullable().optional(),
}).strict();

function recordSchema(recordType: SupportedRecordType) {
  return z.object({
    schemaVersion: z.literal(1),
    sourceApp: z.literal("nutrilift"),
    externalId: z.string().min(1).max(255),
    recordType: z.literal(recordType),
    occurredAt: z.string().datetime({ offset: true }),
    sourceUpdatedAt: z.string().datetime({ offset: true }),
    payload: rowPayload,
    deleted: z.boolean(),
    userId: z.string().min(1).optional(),
  }).strict();
}

export const syncRecordSchemas = {
  "body.training.session": recordSchema("body.training.session"),
  "body.performance": recordSchema("body.performance"),
  "body.training.exercise_log": recordSchema("body.training.exercise_log"),
  "body.training.set_log": recordSchema("body.training.set_log"),
  "body.progression": recordSchema("body.progression"),
  "body.measurement": recordSchema("body.measurement"),
  "body.recovery.sleep": recordSchema("body.recovery.sleep"),
  "body.recovery.hrv": recordSchema("body.recovery.hrv"),
  "body.recovery.energy": recordSchema("body.recovery.energy"),
  "body.recovery.soreness": recordSchema("body.recovery.soreness"),
  "body.recovery.stress": recordSchema("body.recovery.stress"),
  "body.nutrition.adherence": recordSchema("body.nutrition.adherence"),
  "body.nutrition.food_log": recordSchema("body.nutrition.food_log"),
  "body.nutrition.supplement_log": recordSchema("body.nutrition.supplement_log"),
} as const;

export const syncRecordSchema = z.union(Object.values(syncRecordSchemas) as [
  ReturnType<typeof recordSchema>,
  ReturnType<typeof recordSchema>,
  ...ReturnType<typeof recordSchema>[],
]);

export const legacySyncRecordSchema = z.object({
  schemaVersion: z.literal(1),
  sourceApp: z.literal("nutrilift"),
  externalId: z.string().min(1).max(255),
  recordType: z.string().refine((value) => value in syncRecordSchemas, "Unsupported record type."),
  occurredAt: z.string().datetime({ offset: true }),
  sourceUpdatedAt: z.string().datetime({ offset: true }),
  payload: z.record(z.string(), z.unknown()),
  deleted: z.boolean(),
}).strict();

export function validateRecord(record: unknown): { success: true; data: SyncRecord } | { success: false; error: string } {
  const result = syncRecordSchema.safeParse(record);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((issue) => issue.message).join("; ") };
  }
  if (JSON.stringify(result.data).length > 65_535) {
    return { success: false, error: "Record payload exceeds the 64 KiB limit." };
  }
  return { success: true, data: result.data as SyncRecord };
}
