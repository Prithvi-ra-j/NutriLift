import { type SupportedRecordType, type SyncRecord } from "./exportSchema";

export type SyncableRow = Record<string, unknown> & {
  id?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  date?: string | null;
};

function dateToIso(date: string | null | undefined, timestamp?: unknown): string {
  if (typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000).toISOString();
  }
  if (typeof date !== "string" || date.length === 0) {
    throw new Error("A syncable row must include its occurrence date.");
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00.000Z` : new Date(date).toISOString();
}

function sourceUpdatedAt(row: SyncableRow): string {
  if (!row.updated_at || Number.isNaN(Date.parse(row.updated_at))) {
    throw new Error("missing_updated_at");
  }
  return new Date(row.updated_at).toISOString();
}

function createRecord(
  recordType: SupportedRecordType,
  externalId: string,
  occurredAt: string,
  updatedAt: string,
  row: SyncableRow,
  extraPayload: Record<string, unknown> = {},
): SyncRecord {
  const payload: Record<string, unknown> = {
    id: String(row.id ?? externalId),
    row,
    ...extraPayload,
  };
  if (typeof row.session_id === "string") payload.session_id = row.session_id;
  if (typeof row.exercise_log_id === "string") payload.exercise_log_id = row.exercise_log_id;
  return {
    schemaVersion: 1,
    sourceApp: "nutrilift",
    externalId,
    recordType,
    occurredAt,
    sourceUpdatedAt: updatedAt,
    payload,
    deleted: Boolean(row.deleted_at),
  };
}

export function mapWorkoutSession(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.training.session",
    `nutrilift:workout_session:${id}`,
    dateToIso(row.date, row.started_at),
    sourceUpdatedAt(row),
    row,
    {
      dayType: row.day_type,
      durationMin: row.duration_min,
      totalVolumeKg: row.total_volume_kg,
      rpe: row.rpe,
    },
  );
}

export function buildPersonalRecordExternalId(exerciseName: string): string {
  const slug = exerciseName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Personal record exercise name cannot produce an external ID.");
  return `nutrilift:pr:${slug}`;
}

export function mapPersonalRecord(row: SyncableRow): SyncRecord {
  const exerciseName = String(row.exercise_name);
  return createRecord(
    "body.performance",
    buildPersonalRecordExternalId(exerciseName),
    dateToIso(String(row.achieved_date)),
    sourceUpdatedAt(row),
    row,
    {
      exerciseName,
      bestWeightKg: row.best_weight_kg,
      bestRepsAtBestWeight: row.best_reps_at_best_weight,
      best1rmEstimated: row.best_1rm_estimated,
      bestVolumeSingleSet: row.best_volume_single_set,
      previousBestKg: row.previous_best_kg,
      improvementPct: row.improvement_pct,
    },
  );
}

export function mapFoodLog(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.nutrition.food_log",
    `nutrilift:food_log:${id}`,
    dateToIso(row.date, row.created_at),
    sourceUpdatedAt(row),
    row,
  );
}

export function mapSupplementLog(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.nutrition.supplement_log",
    `nutrilift:supplement_log:${id}`,
    dateToIso(row.date, row.logged_at),
    sourceUpdatedAt(row),
    row,
  );
}

export function mapExerciseLog(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.training.exercise_log",
    `nutrilift:exercise_log:${id}`,
    dateToIso(row.date),
    sourceUpdatedAt(row),
    row,
  );
}

export function mapSetLog(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.training.set_log",
    `nutrilift:set_log:${id}`,
    dateToIso(undefined, row.logged_at),
    sourceUpdatedAt(row),
    row,
  );
}

export function mapBodyStat(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.measurement",
    `nutrilift:body_stat:${id}`,
    dateToIso(row.date),
    sourceUpdatedAt(row),
    row,
  );
}

export function mapDailyNutrition(row: SyncableRow): SyncRecord {
  const date = String(row.date);
  return createRecord(
    "body.nutrition.adherence",
    `nutrilift:daily_nutrition:${date}`,
    dateToIso(date),
    sourceUpdatedAt(row),
    row,
    {
      totalCalories: row.total_calories,
      totalProteinG: row.total_protein_g,
      totalCarbsG: row.total_carbs_g,
      totalFatG: row.total_fat_g,
      proteinTargetMet: Boolean(row.protein_target_met),
      calorieTargetMet: Boolean(row.calorie_target_met),
      adherenceScore: row.adherence_score,
    },
  );
}

const recoveryFields: Array<[SupportedRecordType, string]> = [
  ["body.recovery.sleep", "sleep_duration_hr"],
  ["body.recovery.hrv", "hrv"],
  ["body.recovery.energy", "energy_level"],
  ["body.recovery.soreness", "muscle_soreness"],
  ["body.recovery.stress", "stress_level"],
];

export function mapRecoveryLog(row: SyncableRow): SyncRecord[] {
  const date = String(row.date);
  const updatedAt = sourceUpdatedAt(row);

  return recoveryFields.flatMap(([recordType, sourceField]) => {
    if (row[sourceField] === null || row[sourceField] === undefined) return [];
    return [
      createRecord(
        recordType,
        `nutrilift:recovery:${recordType.split(".").at(-1)}:${date}`,
        dateToIso(date),
        updatedAt,
        row,
      ),
    ];
  });
}

export function mapTombstone(
  entityType: string,
  entityId: string,
  deletedAt: string,
  externalId?: string | null,
): SyncRecord | null {
  const recordTypeByEntity: Record<string, SupportedRecordType> = {
    workout_session: "body.training.session",
    personal_record: "body.performance",
    body_stat: "body.measurement",
    daily_nutrition: "body.nutrition.adherence",
  };
  const recordType = recordTypeByEntity[entityType];
  if (!recordType) return null;
  const normalizedDeletedAt = new Date(deletedAt).toISOString();
  return {
    schemaVersion: 1,
    sourceApp: "nutrilift",
    externalId: externalId ?? `nutrilift:${entityType}:${entityId}`,
    recordType,
    occurredAt: normalizedDeletedAt,
    sourceUpdatedAt: normalizedDeletedAt,
    payload: { id: entityId, row: { id: entityId, deleted_at: normalizedDeletedAt } },
    deleted: true,
  };
}
