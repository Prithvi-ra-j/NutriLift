import { Platform } from "react-native";
import { sqlite } from "../data/db/client";
import { inTx } from "../data/db/tx";
import { nowIso } from "../time/clock";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { legacySyncRecordSchema, syncRecordSchema } from "./schemas";

export type CloudSyncRow = {
  external_id: string;
  record_type: string;
  source_app: string;
  occurred_at: string;
  source_updated_at: string | null;
  payload: unknown;
  schema_version: number;
  deleted_at: string | null;
};

export type RestoreItem = {
  table: string;
  key: string;
  row: Record<string, unknown>;
};

type RestoreDatabase = {
  getAllAsync: <T>(source: string) => Promise<T[]>;
  runAsync: (source: string, params: (string | number | null)[]) => Promise<unknown>;
};

const tableForRecordType: Record<string, { table: string; key: string }> = {
  "body.training.session": { table: "workout_sessions", key: "id" },
  "body.training.exercise_log": { table: "exercise_logs", key: "id" },
  "body.training.set_log": { table: "set_logs", key: "id" },
  "body.performance": { table: "personal_records", key: "exercise_name" },
  "body.measurement": { table: "body_stats", key: "id" },
  "body.nutrition.adherence": { table: "daily_nutrition", key: "date" },
  "body.nutrition.food_log": { table: "food_logs", key: "id" },
  "body.nutrition.supplement_log": { table: "supplement_logs", key: "id" },
  "body.recovery.sleep": { table: "recovery_logs", key: "date" },
  "body.recovery.hrv": { table: "recovery_logs", key: "date" },
  "body.recovery.energy": { table: "recovery_logs", key: "date" },
  "body.recovery.soreness": { table: "recovery_logs", key: "date" },
  "body.recovery.stress": { table: "recovery_logs", key: "date" },
};

const restoreOrder = [
  "workout_sessions",
  "food_logs",
  "supplement_logs",
  "body_stats",
  "personal_records",
  "daily_nutrition",
  "recovery_logs",
  "exercise_logs",
  "set_logs",
];

function normalizeLegacyRow(
  recordType: string,
  externalId: string,
  occurredAt: string,
  updatedAt: string,
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const date = occurredAt.slice(0, 10);
  const id = externalId.split(":").at(-1) ?? "";
  switch (recordType) {
    case "body.training.session":
      return {
        id,
        date,
        day_type: payload.dayType,
        duration_min: payload.durationMin ?? null,
        total_volume_kg: payload.totalVolumeKg ?? null,
        rpe: payload.rpe ?? null,
        updated_at: updatedAt,
      };
    case "body.performance":
      if (typeof payload.exerciseName !== "string") return null;
      return {
        exercise_name: payload.exerciseName,
        best_weight_kg: payload.bestWeightKg,
        best_reps_at_best_weight: payload.bestRepsAtBestWeight ?? null,
        best_1rm_estimated: payload.best1rmEstimated ?? null,
        estimated_1rm_kg: payload.best1rmEstimated ?? null,
        best_volume_single_set: payload.bestVolumeSingleSet ?? null,
        achieved_date: date,
        previous_best_kg: payload.previousBestKg ?? null,
        improvement_pct: payload.improvementPct ?? null,
        updated_at: updatedAt,
      };
    case "body.measurement":
      return {
        id,
        date,
        type: payload.type ?? "weight",
        weight_kg: payload.weightKg ?? null,
        body_fat_pct: payload.bodyFatPct ?? null,
        body_fat_mass_kg: payload.bodyFatMassKg ?? null,
        skeletal_muscle_mass_kg: payload.skeletalMuscleMassKg ?? null,
        lean_body_mass_kg: payload.leanBodyMassKg ?? null,
        bmi: payload.bmi ?? null,
        visceral_fat_level: payload.visceralFatLevel ?? null,
        updated_at: updatedAt,
      };
    case "body.nutrition.adherence":
      return {
        date,
        total_calories: payload.totalCalories ?? 0,
        total_protein_g: payload.totalProteinG ?? 0,
        total_carbs_g: payload.totalCarbsG ?? 0,
        total_fat_g: payload.totalFatG ?? 0,
        protein_target_met: payload.proteinTargetMet ? 1 : 0,
        calorie_target_met: payload.calorieTargetMet ? 1 : 0,
        adherence_score: payload.adherenceScore ?? null,
        updated_at: updatedAt,
        food_count: 0,
      };
    case "body.recovery.sleep":
    case "body.recovery.hrv":
    case "body.recovery.energy":
    case "body.recovery.soreness":
    case "body.recovery.stress": {
      const fieldByType: Record<string, string> = {
        "body.recovery.sleep": "sleepDurationHr",
        "body.recovery.hrv": "hrv",
        "body.recovery.energy": "energyLevel",
        "body.recovery.soreness": "muscleSoreness",
        "body.recovery.stress": "stressLevel",
      };
      const field = fieldByType[recordType];
      const columnByField: Record<string, string> = {
        sleepDurationHr: "sleep_duration_hr",
        hrv: "hrv",
        energyLevel: "energy_level",
        muscleSoreness: "muscle_soreness",
        stressLevel: "stress_level",
      };
      return { date, [columnByField[field]]: payload[field] ?? null, updated_at: updatedAt };
    }
    default:
      return null;
  }
}

export function mapCloudRecordToRestoreItem(remote: CloudSyncRow): RestoreItem | null {
  const sourceUpdatedAt = remote.source_updated_at;
  if (!sourceUpdatedAt) {
    throw new Error(`Cloud record ${remote.external_id} is missing source_updated_at.`);
  }
  const target = tableForRecordType[remote.record_type];
  if (!target) {
    throw new Error(`Cloud record ${remote.external_id} has unsupported type ${remote.record_type}.`);
  }
  const candidate = {
    schemaVersion: remote.schema_version,
    sourceApp: remote.source_app,
    externalId: remote.external_id,
    recordType: remote.record_type,
    occurredAt: remote.occurred_at,
    sourceUpdatedAt,
    payload: remote.payload,
    deleted: remote.deleted_at !== null,
  };
  const validated = syncRecordSchema.safeParse(candidate);
  let row: Record<string, unknown> | null;
  if (validated.success) {
    row = validated.data.payload.row;
  } else {
    const legacy = legacySyncRecordSchema.safeParse(candidate);
    if (!legacy.success) {
      throw new Error(`Cloud record ${remote.external_id} is invalid: ${legacy.error.issues.map((issue) => issue.message).join("; ")}`);
    }
    row = normalizeLegacyRow(
      remote.record_type,
      remote.external_id,
      remote.occurred_at,
      sourceUpdatedAt,
      legacy.data.payload,
    );
    if (!row && remote.deleted_at) return null;
    if (!row) {
      throw new Error(`Cloud record ${remote.external_id} cannot be restored from its legacy payload.`);
    }
  }
  if (remote.deleted_at) row.deleted_at = remote.deleted_at;
  const value = row[target.key];
  if (value === null || value === undefined || String(value).length === 0) {
    throw new Error(`Cloud record ${remote.external_id} has no ${target.key}.`);
  }
  return { table: target.table, key: target.key, row };
}

export async function writeRestoreItems(
  database: RestoreDatabase,
  items: RestoreItem[],
): Promise<void> {
  const orderedItems = [...items].sort((left, right) =>
    restoreOrder.indexOf(left.table) - restoreOrder.indexOf(right.table),
  );
  for (const item of orderedItems) {
    const columns = Object.keys(item.row);
    const tableColumns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info("${item.table}")`);
    const allowedColumns = new Set(tableColumns.map((column) => column.name));
    if (
      columns.length === 0 ||
      columns.some((column) => !allowedColumns.has(column) || !/^[a-z_][a-z0-9_]*$/i.test(column))
    ) {
      throw new Error(`Cloud record for ${item.table} contains columns outside the local schema.`);
    }
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const updates = columns
      .filter((column) => column !== item.key)
      .map((column) => `"${column}" = excluded."${column}"`)
      .join(", ");
    if (!updates) throw new Error(`Cloud record for ${item.table} has no restorable fields.`);
    const values = columns.map((column) => toSqliteValue(item.row[column]));
    await database.runAsync(
      `INSERT INTO "${item.table}" (${quotedColumns}) VALUES (${placeholders})
       ON CONFLICT("${item.key}") DO UPDATE SET ${updates}`,
      values,
    );
  }
}

function toSqliteValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new Error("Cloud restore row contains a value that SQLite cannot store.");
}

export async function hasEmptyLocalDatabase(): Promise<boolean> {
  if (Platform.OS === "web" || !sqlite) {
    throw new Error("Cloud restore requires the native SQLite database.");
  }
  const tables = Object.values(tableForRecordType).map((item) => item.table);
  for (const table of new Set(tables)) {
    const result = await sqlite.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`);
    if ((result?.total ?? 0) > 0) return false;
  }
  return true;
}

export async function hasCloudBackup(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  if (!session) return false;
  const { count, error } = await supabase
    .from("sync_records")
    .select("external_id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function markRestorePrompted(): Promise<void> {
  if (!sqlite) throw new Error("Cloud restore requires the native SQLite database.");
  await sqlite.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('restore_prompted', '1', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [nowIso()],
  );
}

export async function restoreFromCloud(): Promise<number> {
  if (Platform.OS === "web" || !sqlite) {
    throw new Error("Cloud restore requires the native SQLite database.");
  }
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  if (!session) throw new Error("Sign in before restoring NutriLift data.");
  if (!(await hasEmptyLocalDatabase())) {
    throw new Error("Cloud restore is only available when the local database is empty.");
  }

  const remoteRows: CloudSyncRow[] = [];
  const pageSize = 200;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("sync_records")
      .select("external_id, record_type, source_app, occurred_at, source_updated_at, payload, schema_version, deleted_at")
      .order("source_updated_at", { ascending: true })
      .order("external_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as CloudSyncRow[];
    remoteRows.push(...page);
    if (page.length < pageSize) break;
  }
  if (remoteRows.length === 0) {
    throw new Error("No cloud backup was found for this account.");
  }

  const items = remoteRows
    .map(mapCloudRecordToRestoreItem)
    .filter((item): item is RestoreItem => item !== null);
  if (items.length === 0) {
    throw new Error("The cloud backup contains no restorable records.");
  }
  await inTx(async () => {
    if (!(await hasEmptyLocalDatabase())) {
      throw new Error("Local data appeared while cloud restore was loading; no data was changed.");
    }
    await writeRestoreItems(sqlite, items);
    await sqlite.runAsync(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('restore_completed', '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [nowIso()],
    );
  }, false);
  return items.length;
}
