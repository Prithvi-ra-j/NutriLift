import {
  DEFAULT_NUTRITION_TARGETS,
  validateNutritionTargets,
  calculateTargetComparison,
  type NutritionTargets,
} from "../../nutrition/target-validation";

describe("nutrition target validation", () => {
  it("accepts the persisted default target set", () => {
    expect(() => validateNutritionTargets(DEFAULT_NUTRITION_TARGETS)).not.toThrow();
  });

  it.each([
    ["calories below safe app range", { calories: 1199 }],
    ["calories above supported range", { calories: 6001 }],
    ["fractional calories", { calories: 2000.5 }],
    ["non-finite calories", { calories: Number.POSITIVE_INFINITY }],
    ["protein below supported range", { protein_g: 19 }],
    ["protein above supported range", { protein_g: 401 }],
    ["negative carbohydrates", { carbs_g: -1 }],
    ["excessive carbohydrates", { carbs_g: 801 }],
    ["negative fat", { fat_g: -0.1 }],
    ["excessive fat", { fat_g: 301 }],
    ["unknown goal", { goal: "cut" }],
    ["unknown mode", { mode: "automatic" }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateNutritionTargets({
      ...DEFAULT_NUTRITION_TARGETS,
      ...overrides,
    } as NutritionTargets)).toThrow();
  });

  it("supports zero carbs or fat without accepting non-finite values", () => {
    expect(() => validateNutritionTargets({
      ...DEFAULT_NUTRITION_TARGETS,
      carbs_g: 0,
      fat_g: 0,
    })).not.toThrow();
    expect(() => validateNutritionTargets({
      ...DEFAULT_NUTRITION_TARGETS,
      protein_g: Number.NaN,
    })).toThrow(/Protein/);
  });
});


describe("target-aware adherence comparison", () => {
  it("computes target flags and score from actual totals", () => {
    const result = calculateTargetComparison({
      total_calories: DEFAULT_NUTRITION_TARGETS.calories,
      total_protein_g: DEFAULT_NUTRITION_TARGETS.protein_g,
    }, DEFAULT_NUTRITION_TARGETS);
    expect(result).toEqual({
      protein_target_met: 1,
      calorie_target_met: 1,
      adherence_score: 100,
    });
  });

  it("caps protein contribution and never modifies actual intake", () => {
    const result = calculateTargetComparison({
      total_calories: 0,
      total_protein_g: DEFAULT_NUTRITION_TARGETS.protein_g * 2,
    }, DEFAULT_NUTRITION_TARGETS);
    expect(result.protein_target_met).toBe(1);
    expect(result.calorie_target_met).toBe(0);
    expect(result.adherence_score).toBe(60);
  });

  it("rejects corrupted stored totals instead of scoring them", () => {
    expect(() => calculateTargetComparison({
      total_calories: Number.NaN,
      total_protein_g: 80,
    }, DEFAULT_NUTRITION_TARGETS)).toThrow("finite, non-negative");
  });
});


jest.mock("../client", () => ({ db: {} }));
import { getNutritionTargetsForDate } from "../queries/nutrition-targets";
import { nutritionTargetHistory } from "../schema";

function fakeTargetExecutor(firstHistoryResult: any[], earliestHistoryResult: any[] = firstHistoryResult) {
  let historyQueries = 0;
  return {
    select: () => {
      let table: unknown;
      const chain: any = {
        from(value: unknown) { table = value; return chain; },
        where() { return chain; },
        orderBy() { return chain; },
        limit: async () => {
          if (table !== nutritionTargetHistory) return [];
          historyQueries += 1;
          return historyQueries === 1 ? firstHistoryResult : earliestHistoryResult;
        },
      };
      return chain;
    },
  };
}

describe("effective-dated target resolution", () => {
  it("does not apply the first known future target to an earlier date", async () => {
    const earliest = {
      effective_date: "2026-10-10", created_at: "2026-10-10T00:00:00.000Z",
      calorie_target_kcal: 2100, protein_target_g: 140, carbs_target_g: 220, fat_target_g: 60,
      source: "manual", goal: "maintain",
    };
    const targets = await getNutritionTargetsForDate("2026-10-01", fakeTargetExecutor([], [earliest]));
    expect(targets).toEqual(DEFAULT_NUTRITION_TARGETS);
  });
  it("returns the version effective on the requested date", async () => {
    const active = {
      effective_date: "2026-10-10", created_at: "2026-10-10T00:00:00.000Z",
      calorie_target_kcal: 2100, protein_target_g: 140, carbs_target_g: 220, fat_target_g: 60,
      source: "adaptive", goal: "maintain",
    };
    const targets = await getNutritionTargetsForDate("2026-10-16", fakeTargetExecutor([active]));
    expect(targets).toMatchObject({ calories: 2100, protein_g: 140, carbs_g: 220, fat_g: 60, goal: "maintain", mode: "adaptive" });
  });
});
