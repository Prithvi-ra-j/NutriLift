import type { NewFoodLog } from "../../db/schema";
import { validateFoodLogInput } from "../food-log-validation";

function validLog(overrides: Partial<NewFoodLog> = {}): NewFoodLog {
  return {
    id: "food-1",
    date: "2026-10-15",
    meal: "breakfast",
    name: "Whole egg",
    quantity_g: 100,
    calories: 143,
    protein_g: 12.6,
    carbs_g: 0.7,
    fat_g: 9.5,
    fiber_g: 0,
    sugar_g: null,
    sodium_mg: null,
    source: "manual",
    raw_input: "2 eggs",
    created_at: 1792022400,
    ...overrides,
  };
}

describe("food log input validation", () => {
  it("accepts a valid normalized food log", () => {
    expect(() => validateFoodLogInput(validLog())).not.toThrow();
  });

  it.each(["2026-1-15", "2026-02-30", "not-a-date"])("rejects invalid date keys: %s", (date) => {
    expect(() => validateFoodLogInput(validLog({ date }))).toThrow("YYYY-MM-DD");
  });

  it("rejects unknown meal and source values", () => {
    expect(() => validateFoodLogInput(validLog({ meal: "brunch" }))).toThrow("valid meal");
    expect(() => validateFoodLogInput(validLog({ source: "type" }))).toThrow("source is invalid");
  });

  it("rejects empty names and non-positive calories", () => {
    expect(() => validateFoodLogInput(validLog({ name: "  " }))).toThrow("Food name");
    expect(() => validateFoodLogInput(validLog({ calories: 0 }))).toThrow("greater than zero");
    expect(() => validateFoodLogInput(validLog({ calories: -1 }))).toThrow("non-negative");
  });

  it("rejects NaN, infinity and negative macro/quantity values", () => {
    expect(() => validateFoodLogInput(validLog({ protein_g: Number.NaN }))).toThrow("finite");
    expect(() => validateFoodLogInput(validLog({ carbs_g: Number.POSITIVE_INFINITY }))).toThrow("finite");
    expect(() => validateFoodLogInput(validLog({ fat_g: -0.1 }))).toThrow("non-negative");
    expect(() => validateFoodLogInput(validLog({ quantity_g: 0 }))).toThrow("quantity must be greater than zero");
  });
});
