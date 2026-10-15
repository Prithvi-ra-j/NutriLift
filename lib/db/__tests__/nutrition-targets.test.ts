import {
  DEFAULT_NUTRITION_TARGETS,
  validateNutritionTargets,
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
