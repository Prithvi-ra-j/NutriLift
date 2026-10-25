import { DatabaseSync } from "node:sqlite";
import {
  mapBodyStat,
  mapDailyNutrition,
  mapExerciseLog,
  mapFoodLog,
  mapPersonalRecord,
  mapRecoveryLog,
  mapSetLog,
  mapSupplementLog,
  mapWorkoutSession,
  type SyncableRow,
} from "../integrations/life-os/recordMappers";
import { migrations } from "../data/db/migrations";
import { migrate, type MigrationDatabase } from "../data/db/migrations/runner";
import { mapCloudRecordToRestoreItem, writeRestoreItems, type CloudSyncRow } from "./restore";
import { toSupabaseSyncRow } from "../integrations/life-os/syncClient";

jest.mock("../data/db/client", () => ({ sqlite: null }));

function createDatabaseAdapter(native: DatabaseSync): MigrationDatabase & {
  getAllAsync: <T>(source: string) => Promise<T[]>;
  runAsync: (source: string, params: (string | number | null)[]) => Promise<unknown>;
} {
  return {
    execAsync: async (source: string) => {
      native.exec(source);
    },
    getFirstAsync: async <T>(source: string) =>
      (native.prepare(source).get() as T | undefined) ?? null,
    getAllAsync: async <T>(source: string) =>
      native.prepare(source).all() as T[],
    runAsync: async (source: string, params: (string | number | null)[]) =>
      native.prepare(source).run(...params),
    withTransactionAsync: async (task) => {
      native.exec("BEGIN");
      try {
        await task();
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function seedDatabaseFromRecords(
  native: DatabaseSync,
  records: ReturnType<typeof mapWorkoutSession>[],
): void {
  const targetByType: Record<string, { table: string; key: string }> = {
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
  const seeded = new Set<string>();

  for (const record of records) {
    const target = targetByType[record.recordType];
    if (!target) throw new Error(`No seed table configured for ${record.recordType}.`);
    const rowValue = record.payload.row;
    if (typeof rowValue !== "object" || rowValue === null || Array.isArray(rowValue)) {
      throw new Error(`Seed record ${record.externalId} has no row payload.`);
    }
    const row = rowValue as Record<string, unknown>;
    const key = row[target.key];
    if (key === null || key === undefined) throw new Error(`Seed row is missing ${target.key}.`);
    const seedKey = `${target.table}:${String(key)}`;
    if (seeded.has(seedKey)) continue;
    seeded.add(seedKey);

    const columns = Object.keys(row);
    const values = columns.map((column) => {
      const value = row[column];
      if (value === null || value === undefined) return null;
      if (typeof value === "string" || typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      throw new Error(`Unsupported seed value for ${target.table}.${column}.`);
    });
    native.prepare(
      `INSERT INTO "${target.table}" (${columns.map((column) => `"${column}"`).join(", ")})
       VALUES (${columns.map(() => "?").join(", ")})`,
    ).run(...values);
  }
}

function readRow(native: DatabaseSync, table: string): SyncableRow {
  const row = native.prepare(`SELECT * FROM "${table}" LIMIT 1`).get() as SyncableRow | undefined;
  if (!row) throw new Error(`Expected seeded row in ${table}.`);
  return row;
}

describe("cloud restore records", () => {
  it("round-trips food, sessions, exercises, sets, PRs, body, nutrition, and recovery rows", async () => {
    const updatedAt = "2026-10-24T08:00:00.000Z";
    const session = {
      id: "session-1",
      date: "2026-10-24",
      day_type: "Push A",
      started_at: Date.parse(updatedAt),
      ended_at: null,
      duration_min: 45,
      total_volume_kg: 2400,
      notes: null,
      rpe: 7,
      updated_at: updatedAt,
      deleted_at: null,
    };
    const rows = [
      mapWorkoutSession(session),
      mapFoodLog({
        id: "food-1",
        date: "2026-10-24",
        meal: "lunch",
        name: "Rice",
        quantity_g: 150,
        calories: 190,
        protein_g: 4,
        carbs_g: 42,
        fat_g: 1,
        fiber_g: null,
        sugar_g: null,
        sodium_mg: null,
        source: "manual",
        raw_input: null,
        created_at: Date.parse(updatedAt),
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapSupplementLog({
        id: "supplement-1",
        date: "2026-10-24",
        supplement_name: "Creatine",
        taken: 1,
        logged_at: Date.parse(updatedAt),
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapExerciseLog({
        id: "exercise-1",
        session_id: "session-1",
        date: "2026-10-24",
        exercise_name: "Bench Press",
        muscle_group: "chest",
        equipment: "barbell",
        exercise_type: "weight_reps",
        order_in_session: 1,
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapSetLog({
        id: "set-1",
        exercise_log_id: "exercise-1",
        set_number: 1,
        weight_kg: 60,
        reps: 8,
        duration_sec: null,
        distance_km: null,
        rpe: null,
        is_pr: 0,
        is_warmup: 0,
        notes: null,
        logged_at: Date.parse(updatedAt),
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapPersonalRecord({
        exercise_name: "Bench Press",
        best_weight_kg: 60,
        best_reps_at_best_weight: 8,
        best_1rm_estimated: 76,
        estimated_1rm_kg: 76,
        best_volume_single_set: 480,
        achieved_date: "2026-10-24",
        previous_best_kg: null,
        improvement_pct: null,
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapBodyStat({
        id: "body-1",
        date: "2026-10-24",
        type: "weight",
        weight_kg: 70,
        updated_at: updatedAt,
        deleted_at: null,
      }),
      mapDailyNutrition({
        date: "2026-10-24",
        total_calories: 190,
        total_protein_g: 4,
        total_carbs_g: 42,
        total_fat_g: 1,
        protein_target_met: 0,
        calorie_target_met: 0,
        adherence_score: null,
        updated_at: updatedAt,
      }),
      ...mapRecoveryLog({
        date: "2026-10-24",
        sleep_duration_hr: 7.5,
        hrv: 55,
        energy_level: 4,
        muscle_soreness: 2,
        stress_level: 1,
        updated_at: updatedAt,
      }),
    ];
    const sourceNative = new DatabaseSync(":memory:");
    const restoredNative = new DatabaseSync(":memory:");
    try {
      const sourceDatabase = createDatabaseAdapter(sourceNative);
      const restoredDatabase = createDatabaseAdapter(restoredNative);
      await migrate(sourceDatabase, migrations);
      await migrate(restoredDatabase, migrations);
      seedDatabaseFromRecords(sourceNative, rows);

      const sourceRecords = [
        mapWorkoutSession(readRow(sourceNative, "workout_sessions")),
        mapFoodLog(readRow(sourceNative, "food_logs")),
        mapSupplementLog(readRow(sourceNative, "supplement_logs")),
        mapExerciseLog(readRow(sourceNative, "exercise_logs")),
        mapSetLog(readRow(sourceNative, "set_logs")),
        mapPersonalRecord(readRow(sourceNative, "personal_records")),
        mapBodyStat(readRow(sourceNative, "body_stats")),
        mapDailyNutrition(readRow(sourceNative, "daily_nutrition")),
        ...mapRecoveryLog(readRow(sourceNative, "recovery_logs")),
      ];
      const fakeCloud = new Map<string, ReturnType<typeof toSupabaseSyncRow>>();
      for (const record of sourceRecords) {
        const uploaded = toSupabaseSyncRow(record);
        const stored = fakeCloud.get(uploaded.external_id);
        if (!stored || uploaded.source_updated_at >= stored.source_updated_at) {
          fakeCloud.set(uploaded.external_id, uploaded);
        }
      }
      const cloudRows: CloudSyncRow[] = [...fakeCloud.values()].map((record) => ({
        external_id: record.external_id,
        record_type: record.record_type,
        source_app: record.source_app,
        occurred_at: record.occurred_at,
        source_updated_at: record.source_updated_at,
        payload: record.payload,
        schema_version: record.schema_version,
        deleted_at: record.deleted_at,
      }));
      const items = cloudRows
        .map(mapCloudRecordToRestoreItem)
        .filter((item) => item !== null);

      await restoredDatabase.withTransactionAsync(() => writeRestoreItems(restoredDatabase, items));

      for (const table of [
        "workout_sessions",
        "food_logs",
        "supplement_logs",
        "body_stats",
        "personal_records",
        "daily_nutrition",
        "recovery_logs",
        "exercise_logs",
        "set_logs",
      ]) {
        expect(restoredNative.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).all()).toEqual(
          sourceNative.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).all(),
        );
      }
    } finally {
      sourceNative.close();
      restoredNative.close();
    }
  });
});
