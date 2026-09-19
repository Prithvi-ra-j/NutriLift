import { type SupportedRecordType, type SyncRecord } from "./exportSchema";

type SyncableRow = Record<string, unknown> & { updated_at?: string | null; date?: string | null };

function dateToIso(date: string | null | undefined, timestamp?: unknown): string {
  if (typeof timestamp === "number" && timestamp > 0) {
    return new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000).toISOString();
  }

  return `${date ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function sourceUpdatedAt(row: SyncableRow): string {
  return row.updated_at ?? new Date().toISOString();
}

function createRecord(
  recordType: SupportedRecordType,
  externalId: string,
  occurredAt: string,
  updatedAt: string,
  payload: Record<string, unknown>
): SyncRecord {
  return {
    schemaVersion: 1,
    sourceApp: "nutrilift",
    externalId,
    recordType,
    occurredAt,
    sourceUpdatedAt: updatedAt,
    payload,
    deleted: false,
  };
}

export function mapWorkoutSession(row: SyncableRow): SyncRecord {
  const id = String(row.id);
  return createRecord(
    "body.training.session",
    `nutrilift:workout_session:${id}`,
    dateToIso(row.date, row.started_at),
    sourceUpdatedAt(row),
    {
      dayType: row.day_type,
      durationMin: row.duration_min,
      totalVolumeKg: row.total_volume_kg,
      rpe: row.rpe,
    }
  );
}

export function buildPersonalRecordExternalId(exerciseName: string, achievedDate: string): string {
  return `nutrilift:personal_record:${encodeURIComponent(exerciseName)}:${achievedDate}`;
}

export function mapPersonalRecord(row: SyncableRow): SyncRecord {
  const exerciseName = String(row.exercise_name);
  const achievedDate = String(row.achieved_date);
  return createRecord(
    "body.performance",
    buildPersonalRecordExternalId(exerciseName, achievedDate),
    dateToIso(achievedDate),
    sourceUpdatedAt(row),
    {
      exerciseName,
      bestWeightKg: row.best_weight_kg,
      bestRepsAtBestWeight: row.best_reps_at_best_weight,
      best1rmEstimated: row.best_1rm_estimated,
      bestVolumeSingleSet: row.best_volume_single_set,
      previousBestKg: row.previous_best_kg,
      improvementPct: row.improvement_pct,
    }
  );
}

export function mapBodyStat(row: SyncableRow): SyncRecord {
  return createRecord(
    "body.measurement",
    `nutrilift:body_stat:${String(row.id)}`,
    dateToIso(row.date),
    sourceUpdatedAt(row),
    {
      type: row.type,
      weightKg: row.weight_kg,
      bodyFatPct: row.body_fat_pct,
      bodyFatMassKg: row.body_fat_mass_kg,
      skeletalMuscleMassKg: row.skeletal_muscle_mass_kg,
      leanBodyMassKg: row.lean_body_mass_kg,
      bmi: row.bmi,
      visceralFatLevel: row.visceral_fat_level,
    }
  );
}

export function mapDailyNutrition(row: SyncableRow): SyncRecord {
  const date = String(row.date);
  return createRecord(
    "body.nutrition.adherence",
    `nutrilift:daily_nutrition:${date}`,
    dateToIso(date),
    sourceUpdatedAt(row),
    {
      totalCalories: row.total_calories,
      totalProteinG: row.total_protein_g,
      totalCarbsG: row.total_carbs_g,
      totalFatG: row.total_fat_g,
      proteinTargetMet: Boolean(row.protein_target_met),
      calorieTargetMet: Boolean(row.calorie_target_met),
      adherenceScore: row.adherence_score,
    }
  );
}

const recoveryFields: Array<[SupportedRecordType, string, string]> = [
  ["body.recovery.sleep", "sleep_duration_hr", "sleepDurationHr"],
  ["body.recovery.hrv", "hrv", "hrv"],
  ["body.recovery.energy", "energy_level", "energyLevel"],
  ["body.recovery.soreness", "muscle_soreness", "muscleSoreness"],
  ["body.recovery.stress", "stress_level", "stressLevel"],
];

export function mapRecoveryLog(row: SyncableRow): SyncRecord[] {
  const date = String(row.date);
  const updatedAt = sourceUpdatedAt(row);

  return recoveryFields.flatMap(([recordType, sourceField, payloadField]) => {
    const value = row[sourceField];
    if (value === null || value === undefined) return [];

    return [
      createRecord(
        recordType,
        `nutrilift:recovery:${recordType.split(".").at(-1)}:${date}`,
        dateToIso(date),
        updatedAt,
        { [payloadField]: value }
      ),
    ];
  });
}

export function mapTombstone(
  entityType: string,
  entityId: string,
  deletedAt: string,
  externalId?: string | null
): SyncRecord | null {
  const recordTypeByEntity: Record<string, SupportedRecordType> = {
    workout_session: "body.training.session",
    personal_record: "body.performance",
    body_stat: "body.measurement",
    daily_nutrition: "body.nutrition.adherence",
  };
  const recordType = recordTypeByEntity[entityType];
  if (!recordType) return null;

  return {
    schemaVersion: 1,
    sourceApp: "nutrilift",
    externalId: externalId ?? `nutrilift:${entityType}:${entityId}`,
    recordType,
    occurredAt: deletedAt,
    sourceUpdatedAt: deletedAt,
    payload: {},
    deleted: true,
  };
}
