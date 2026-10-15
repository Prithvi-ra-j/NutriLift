import {
  DEFAULT_NUTRITION_TARGETS,
  validateNutritionTargets,
  type NutritionTargets,
} from "../../db/queries/nutrition-targets";

describe("nutrition target validation", () => {
  it("accepts the app's default target set", () => {
    expect(() => validateNutritionTargets(DEFAULT_NUTRITION_TARGETS)).not.toThrow();
  });

  it.each([
    ["calories below supported range", { calories: 1199 }],
    ["calories above supported range", { calories: 6001 }],
    ["fractional calories", { calories: 2000.5 }],
    ["non-finite calories", { calories: Number.POSITIVE_INFINITY }],
    ["protein below supported range", { protein_g: 19 }],
    ["protein above supported range", { protein_g: 401 }],
    ["negative carbs", { carbs_g: -1 }],
    ["carbs above supported range", { carbs_g: 801 }],
    ["negative fat", { fat_g: -1 }],
    ["fat above supported range", { fat_g: 301 }],
    ["non-finite macro", { protein_g: Number.NaN }],
    ["unknown goal", { goal: "cut" }],
    ["unknown mode", { mode: "automatic" }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateNutritionTargets({
      ...DEFAULT_NUTRITION_TARGETS,
      ...overrides,
    } as NutritionTargets)).toThrow();
  });

  it("allows zero carbs or fat when intentionally selected", () => {
    expect(() => validateNutritionTargets({
      ...DEFAULT_NUTRITION_TARGETS,
      carbs_g: 0,
      fat_g: 0,
    })).not.toThrow();
  });
});
