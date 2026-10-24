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
} from "../integrations/life-os/recordMappers";
import { migrations } from "../db/migrations";
import { migrate, type MigrationDatabase } from "../db/migrations/runner";
import { mapCloudRecordToRestoreItem, writeRestoreItems, type CloudSyncRow } from "./restore";
import { toSupabaseSyncRow } from "../integrations/life-os/syncClient";

jest.mock("../db/client", () => ({ sqlite: null }));

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
    const fakeCloud = new Map<string, ReturnType<typeof toSupabaseSyncRow>>();
    for (const record of rows) {
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

    const native = new DatabaseSync(":memory:");
    try {
      const database = createDatabaseAdapter(native);
      await migrate(database, migrations);
      await database.withTransactionAsync(() => writeRestoreItems(database, items));

      expect(native.prepare("SELECT id, date, day_type FROM workout_sessions").all()).toEqual([
        { id: "session-1", date: "2026-10-24", day_type: "Push A" },
      ]);
      expect(native.prepare("SELECT id, session_id FROM exercise_logs").all()).toEqual([
        { id: "exercise-1", session_id: "session-1" },
      ]);
      expect(native.prepare("SELECT id, exercise_log_id, weight_kg FROM set_logs").all()).toEqual([
        { id: "set-1", exercise_log_id: "exercise-1", weight_kg: 60 },
      ]);
      expect(native.prepare("SELECT id, name, calories FROM food_logs").all()).toEqual([
        { id: "food-1", name: "Rice", calories: 190 },
      ]);
      expect(native.prepare("SELECT id, supplement_name, taken FROM supplement_logs").all()).toEqual([
        { id: "supplement-1", supplement_name: "Creatine", taken: 1 },
      ]);
      expect(native.prepare("SELECT exercise_name, best_weight_kg FROM personal_records").all()).toEqual([
        { exercise_name: "Bench Press", best_weight_kg: 60 },
      ]);
      expect(native.prepare("SELECT id, weight_kg FROM body_stats").all()).toEqual([
        { id: "body-1", weight_kg: 70 },
      ]);
      expect(native.prepare("SELECT date, total_calories FROM daily_nutrition").all()).toEqual([
        { date: "2026-10-24", total_calories: 190 },
      ]);
      expect(native.prepare("SELECT date, sleep_duration_hr, hrv FROM recovery_logs").all()).toEqual([
        { date: "2026-10-24", sleep_duration_hr: 7.5, hrv: 55 },
      ]);
    } finally {
      native.close();
    }
  });
});
