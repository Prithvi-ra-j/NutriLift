export const SUPPORTED_RECORD_TYPES = [
  "body.training.session",
  "body.performance",
  "body.progression",
  "body.measurement",
  "body.recovery.sleep",
  "body.recovery.hrv",
  "body.recovery.energy",
  "body.recovery.soreness",
  "body.recovery.stress",
  "body.nutrition.adherence",
] as const;

export type SupportedRecordType = (typeof SUPPORTED_RECORD_TYPES)[number];

export type SyncRecord = {
  schemaVersion: number;
  sourceApp: "nutrilift";
  externalId: string;
  recordType: SupportedRecordType | string;
  occurredAt: string;
  sourceUpdatedAt?: string;
  payload: Record<string, unknown>;
  deleted?: boolean;
  userId?: string;
};

function containsNegativeNumber(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value < 0;
  if (Array.isArray(value)) return value.some(containsNegativeNumber);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsNegativeNumber);
  }
  return false;
}

export function validateSyncRecord(record: Partial<SyncRecord> | null | undefined): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!record || typeof record !== "object") {
    return { valid: false, errors: ["Record is missing"] };
  }

  if (record.schemaVersion !== 1) {
    errors.push("Unsupported schemaVersion");
  }

  if (!record.externalId || typeof record.externalId !== "string") {
    errors.push("Missing externalId");
  }

  if (typeof record.recordType !== "string" || !SUPPORTED_RECORD_TYPES.includes(record.recordType as SupportedRecordType)) {
    errors.push("Unknown recordType");
  }

  if (!record.occurredAt || Number.isNaN(Date.parse(record.occurredAt))) {
    errors.push("occurredAt is invalid");
  }

  if (record.payload && typeof record.payload === "object") {
    const payloadSize = JSON.stringify(record.payload).length;
    if (payloadSize > 200000) {
      errors.push("Payload exceeds reasonable size");
    }

    if (containsNegativeNumber(record.payload)) {
      errors.push("Numeric values are negative when they should not be");
    }
  }

  if (!record.userId || typeof record.userId !== "string") {
    errors.push("User ownership is missing");
  }

  if (record.sourceApp !== "nutrilift") {
    errors.push("Source is not nutriLift");
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function buildDeterministicFactId(recordType: string, externalId: string): string {
  return `fact:nutrilift:${recordType}:${externalId}`;
}
