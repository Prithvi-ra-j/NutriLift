jest.mock("../../pauseMode", () => ({
  isTrackingPausedOnDate: (date: string, from: string | null, until: string | null) =>
    Boolean(from && until && date >= from && date <= until),
}));

import { summarizeNutrition } from "../nutritionAggregate";

describe("coach nutrition aggregates", () => {
  it("excludes paused and unlogged days from averages and adherence rates", () => {
    expect(summarizeNutrition([
      {
        date: "2026-10-20",
        food_count: 2,
        total_calories: 1_800,
        total_protein_g: 100,
        calorie_target_met: 1,
        protein_target_met: 1,
      },
      {
        date: "2026-10-21",
        food_count: 3,
        total_calories: 500,
        total_protein_g: 20,
        calorie_target_met: 0,
        protein_target_met: 0,
      },
      {
        date: "2026-10-22",
        food_count: 0,
        total_calories: 0,
        total_protein_g: 0,
        calorie_target_met: null,
        protein_target_met: null,
      },
    ], "2026-10-21", "2026-10-27")).toEqual({
      days_logged: 1,
      average_calories: 1_800,
      average_protein_g: 100,
      calorie_adherence_pct: 100,
      protein_hit_rate_pct: 100,
    });
  });

  it("does not turn unavailable adherence into a zero-percent score", () => {
    expect(summarizeNutrition([{
      date: "2026-10-20",
      food_count: 1,
      total_calories: 1_800,
      total_protein_g: 100,
      calorie_target_met: null,
      protein_target_met: null,
    }], null, null)).toMatchObject({
      days_logged: 1,
      calorie_adherence_pct: null,
      protein_hit_rate_pct: null,
    });
  });
});
