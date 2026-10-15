import { buildAdaptiveTargetInput } from "../adaptive-target-service";
import { DEFAULT_NUTRITION_TARGETS } from "../target-validation";
import type { DailyNutrition, BodyStat } from "../../db/schema";

function nutritionRow(date: string, isComplete: number): DailyNutrition {
  return { date, total_calories: 2200, total_protein_g: 130, total_carbs_g: 250, total_fat_g: 70,
    protein_target_met: 1, calorie_target_met: 1, adherence_score: 100, notes: null, updated_at: null,
    is_complete: isComplete, completed_at: isComplete ? "2026-10-15T12:00:00.000Z" : null };
}

function weightRow(date: string, weight: number | null): BodyStat {
  return { id: date, date, type: "weight", weight_kg: weight, body_fat_pct: null, body_fat_mass_kg: null,
    skeletal_muscle_mass_kg: null, lean_body_mass_kg: null, bmi: null, inbody_score: null, tbw_l: null,
    ecw_tbw_ratio: null, visceral_fat_level: null, seg_muscle_right_arm: null, seg_muscle_left_arm: null,
    seg_muscle_trunk: null, seg_muscle_right_leg: null, seg_muscle_left_leg: null, seg_fat_right_arm: null,
    seg_fat_left_arm: null, seg_fat_trunk: null, seg_fat_right_leg: null, seg_fat_left_leg: null,
    raw_paste: null, source: null, updated_at: null };
}

describe("adaptive target input", () => {
  it("only treats an explicitly completed day as reviewed intake", () => {
    const input = buildAdaptiveTargetInput(DEFAULT_NUTRITION_TARGETS,
      [nutritionRow("2026-10-14", 1), nutritionRow("2026-10-15", 0)],
      [weightRow("2026-10-15", 74), weightRow("2026-10-14", null)]);
    expect(input.intakeDays.map((day) => [day.complete, day.quality])).toEqual([[true, "reviewed"], [false, "unresolved"]]);
    expect(input.weights).toEqual([{ date: "2026-10-15", weightKg: 74 }]);
  });
});
