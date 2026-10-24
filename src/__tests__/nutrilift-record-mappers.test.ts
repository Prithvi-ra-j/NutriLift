import {
  buildPersonalRecordExternalId,
  mapDailyNutrition,
  mapExerciseLog,
  mapFoodLog,
  mapTombstone,
  mapSetLog,
  mapRecoveryLog,
  mapWorkoutSession,
} from "../../lib/integrations/life-os/recordMappers";
import { toSupabaseSyncRow } from "../../lib/integrations/life-os/syncClient";

jest.mock("../../lib/db/client", () => ({ sqlite: null }));

describe("NutriLift record mappers", () => {
  it("creates stable external IDs for a workout", () => {
    const record = mapWorkoutSession({
      id: "session-1",
      date: "2026-09-20",
      day_type: "Push A",
      duration_min: 50,
      total_volume_kg: 3210,
      updated_at: "2026-09-20T18:00:00.000Z",
    });

    expect(record.externalId).toBe("nutrilift:workout_session:session-1");
    expect(record.recordType).toBe("body.training.session");
    expect(record.payload).toMatchObject({ durationMin: 50, totalVolumeKg: 3210 });
  });

  it("exports only populated recovery signals", () => {
    const records = mapRecoveryLog({
      date: "2026-09-20",
      sleep_duration_hr: 7.5,
      hrv: null,
      energy_level: 4,
      updated_at: "2026-09-20T18:00:00.000Z",
    });

    expect(records.map((record) => record.recordType)).toEqual([
      "body.recovery.sleep",
      "body.recovery.energy",
    ]);
  });

  it("preserves corrections with an idempotent cloud key", () => {
    const record = mapDailyNutrition({
      date: "2026-09-20",
      total_calories: 2200,
      total_protein_g: 160,
      total_carbs_g: 230,
      total_fat_g: 70,
      updated_at: "2026-09-20T18:00:00.000Z",
    });

    expect(toSupabaseSyncRow(record)).toMatchObject({
      external_id: "nutrilift:daily_nutrition:2026-09-20",
      source_app: "nutrilift",
      source_updated_at: "2026-09-20T18:00:00.000Z",
    });
    expect(toSupabaseSyncRow(record)).not.toHaveProperty("user_id");
  });

  it("preserves a personal record's canonical ID when creating a tombstone", () => {
    const externalId = buildPersonalRecordExternalId("Barbell Bench Press");
    const tombstone = mapTombstone("personal_record", "Barbell Bench Press", "2026-09-21T12:00:00.000Z", externalId);

    expect(tombstone).toMatchObject({
      externalId: "nutrilift:pr:barbell-bench-press",
      recordType: "body.performance",
      deleted: true,
    });
  });

  it("maps food, exercise, and set rows with parent identifiers and deletion state", () => {
    const food = mapFoodLog({
      id: "food-1",
      date: "2026-10-23",
      created_at: 1_792_742_400,
      updated_at: "2026-10-23T12:00:00.000Z",
      deleted_at: "2026-10-23T12:05:00.000Z",
    });
    const exercise = mapExerciseLog({
      id: "exercise-1",
      session_id: "session-1",
      date: "2026-10-23",
      updated_at: "2026-10-23T12:00:00.000Z",
    });
    const set = mapSetLog({
      id: "set-1",
      exercise_log_id: "exercise-1",
      logged_at: 1_792_742_400,
      updated_at: "2026-10-23T12:00:00.000Z",
    });

    expect(food).toMatchObject({
      externalId: "nutrilift:food_log:food-1",
      recordType: "body.nutrition.food_log",
      deleted: true,
    });
    expect(exercise.payload).toMatchObject({ session_id: "session-1" });
    expect(set.payload).toMatchObject({ exercise_log_id: "exercise-1" });
  });

  it("rejects rows without an update timestamp instead of fabricating one", () => {
    expect(() => mapWorkoutSession({
      id: "session-2",
      date: "2026-10-23",
      day_type: "Push A",
    })).toThrow("missing_updated_at");
  });
});
