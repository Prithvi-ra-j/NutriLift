jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({ execAsync: async () => undefined, getAllAsync: async () => [] }),
}));
jest.mock("drizzle-orm/expo-sqlite", () => ({ drizzle: () => ({}) }));

import {
  buildPersonalRecordExternalId,
  mapDailyNutrition,
  mapFoodLog,
  mapTombstone,
  mapRecoveryLog,
  mapWorkoutSession,
} from "../../lib/integrations/life-os/recordMappers";
import { toSupabaseSyncRow } from "../../lib/integrations/life-os/syncClient";

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

  it("exports food logs with stable IDs and no raw user input", () => {
    const record = mapFoodLog({
      id: "food-1",
      date: "2026-10-30",
      meal: "lunch",
      name: "Dal rice",
      quantity_g: 350,
      calories: 520,
      protein_g: 22,
      carbs_g: 78,
      fat_g: 12,
      fiber_g: 8,
      sugar_g: 4,
      sodium_mg: 540,
      source: "manual",
      raw_input: "private note",
      provenance_type: "user_entered",
      estimate_confidence: null,
      estimate_reviewed: 1,
      created_at: 1793380000,
      updated_at: "2026-10-30T12:00:00.000Z",
    });

    expect(record.externalId).toBe("nutrilift:food_log:food-1");
    expect(record.recordType).toBe("body.nutrition.food");
    expect(record.sourceUpdatedAt).toBe("2026-10-30T12:00:00.000Z");
    expect(record.payload).toMatchObject({ name: "Dal rice", calories: 520, estimateReviewed: true });
    expect(record.payload).not.toHaveProperty("raw_input");
  });

  it("exports only populated recovery signals", () => {
    const records = mapRecoveryLog({
      date: "2026-09-20",
      sleep_duration_hr: 7.5,
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

    expect(toSupabaseSyncRow(record, "user-1")).toMatchObject({
      user_id: "user-1",
      external_id: "nutrilift:daily_nutrition:2026-09-20",
      source_app: "nutrilift",
    });
  });

  it("preserves a personal record's canonical ID when creating a tombstone", () => {
    const externalId = buildPersonalRecordExternalId("Barbell Bench Press", "2026-09-20");
    const tombstone = mapTombstone("personal_record", "Barbell Bench Press", "2026-09-21T12:00:00.000Z", externalId);

    expect(tombstone).toMatchObject({
      externalId: "nutrilift:personal_record:Barbell%20Bench%20Press:2026-09-20",
      recordType: "body.performance",
      deleted: true,
    });
  });
});
