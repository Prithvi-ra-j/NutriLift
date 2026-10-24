import { syncRecordSchema } from "../../sync/schemas";

export const SUPPORTED_RECORD_TYPES = [
  "body.training.session",
  "body.performance",
  "body.training.exercise_log",
  "body.training.set_log",
  "body.progression",
  "body.measurement",
  "body.recovery.sleep",
  "body.recovery.hrv",
  "body.recovery.energy",
  "body.recovery.soreness",
  "body.recovery.stress",
  "body.nutrition.adherence",
  "body.nutrition.food_log",
  "body.nutrition.supplement_log",
] as const;

export type SupportedRecordType = (typeof SUPPORTED_RECORD_TYPES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedRecordType(value: string): value is SupportedRecordType {
  return SUPPORTED_RECORD_TYPES.some((recordType) => recordType === value);
}

export type SyncRecord = {
  schemaVersion: number;
  sourceApp: "nutrilift";
  externalId: string;
  recordType: SupportedRecordType;
  occurredAt: string;
  sourceUpdatedAt: string;
  payload: Record<string, unknown>;
  deleted: boolean;
  userId?: string;
};

export function validateSyncRecord(record: unknown): { valid: boolean; errors?: string[] } {
  if (isRecord(record)) {
    const candidate = record;
    if (candidate.schemaVersion !== 1) {
      return { valid: false, errors: ["Unsupported schemaVersion"] };
    }
    if (
      typeof candidate.recordType === "string" &&
      !isSupportedRecordType(candidate.recordType)
    ) {
      return { valid: false, errors: ["Unknown recordType"] };
    }
  }
  const result = syncRecordSchema.safeParse(record);
  return result.success
    ? { valid: true }
    : { valid: false, errors: result.error.issues.map((issue) => issue.message) };
}

export function buildDeterministicFactId(recordType: string, externalId: string): string {
  return `fact:nutrilift:${recordType}:${externalId}`;
}
