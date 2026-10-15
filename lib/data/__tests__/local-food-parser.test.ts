import { parseFoodLocally } from "../local-food-parser";
import { validateFoodLogInput, validateFoodLogsInput } from "../food-log-validation";
import type { NewFoodLog } from "../../db/schema";

describe("local food parser", () => {
  it("parses common Indian meal text without an AI call", () => {
    const result = parseFoodLocally("2 eggs, dal, 1 roti");

    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.name)).toEqual([
      "Whole egg",
      "Dal (cooked)",
      "Roti (Wheat)",
    ]);
    expect(result.items[0].quantity_g).toBe(100);
    expect(result.items.every((item) => item.calories > 0)).toBe(true);
    expect(result.unresolved_items).toEqual([]);
  });

  it("preserves breakfast, lunch, dinner and snack cues", () => {
    expect(parseFoodLocally("for breakfast 2 eggs").meal_suggestion).toBe("breakfast");
    expect(parseFoodLocally("rice and dal for lunch").meal_suggestion).toBe("lunch");
    expect(parseFoodLocally("chicken for dinner").meal_suggestion).toBe("dinner");
    expect(parseFoodLocally("banana as a snack").meal_suggestion).toBe("snack");
  });

  it("normalizes aliases and supports explicit gram amounts", () => {
    const result = parseFoodLocally("100 g paneer, 1 chapati");

    expect(result.items[0]).toMatchObject({ name: "Paneer", quantity_g: 100, calories: 265 });
    expect(result.items[1].name).toBe("Roti (Wheat)");
    expect(result.unresolved_items).toEqual([]);
  });

  it("uses matching catalogue serving sizes for cups, bowls and counted foods", () => {
    const result = parseFoodLocally("1 cup dal, 2 rotis, 1 bowl rice");
    expect(result.items.map((item) => item.quantity_g)).toEqual([180, 70, 200]);
    expect(result.unresolved_items).toEqual([]);
  });

  it("returns unresolved segments rather than silently inventing nutrition", () => {
    const result = parseFoodLocally("2 eggs, homemade biryani");

    expect(result.items).toHaveLength(1);
    expect(result.unresolved_items).toEqual(["homemade biryani"]);
  });

  it("does not invent zero-calorie items for an empty or unknown input", () => {
    expect(parseFoodLocally("").items).toEqual([]);
    expect(parseFoodLocally("something my own recipe").items).toEqual([]);
  });

  it("catalogue has unique IDs and non-negative normalized nutrition values", () => {
    const { INDIAN_FOOD_DB } = require("../indianFoodDB");
    const ids = INDIAN_FOOD_DB.map((food: { id: string }) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const food of INDIAN_FOOD_DB) {
      for (const value of Object.values(food.per100g)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(food.commonServings.length).toBeGreaterThan(0);
    }
  });
});


describe("food log write validation", () => {
  const validLog: NewFoodLog = {
    id: "food-1", date: "2026-10-15", meal: "breakfast", name: "Egg",
    quantity_g: 50, calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8,
    fiber_g: 0, sugar_g: null, sodium_mg: null, source: "manual",
    raw_input: "1 egg", created_at: 1792022400,
  };

  it("accepts valid logs with individual zero-valued macros", () => {
    expect(() => validateFoodLogInput(validLog)).not.toThrow();
  });

  it.each([
    ["zero nutrition", { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }],
    ["negative nutrition", { calories: -1 }],
    ["non-finite nutrition", { protein_g: Number.POSITIVE_INFINITY }],
    ["empty name", { name: " " }],
    ["invalid meal", { meal: "brunch" }],
    ["impossible date", { date: "2026-02-30" }],
    ["zero quantity", { quantity_g: 0 }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateFoodLogInput({ ...validLog, ...overrides } as NewFoodLog)).toThrow();
  });
});

describe("food log batch validation", () => {
  const base: NewFoodLog = {
    id: "meal-1", date: "2026-10-15", meal: "breakfast", name: "Egg",
    quantity_g: 50, calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8,
    fiber_g: 0, sugar_g: null, sodium_mg: null, source: "manual",
    raw_input: "1 egg", created_at: 1792022400,
  };

  it("accepts a valid multi-item meal", () => {
    expect(() => validateFoodLogsInput([base, { ...base, id: "meal-2", name: "Roti", calories: 80 }])).not.toThrow();
  });
  it("rejects empty batches, duplicate IDs, mixed dates, and mixed meals", () => {
    expect(() => validateFoodLogsInput([])).toThrow(/at least one/);
    expect(() => validateFoodLogsInput([base, base])).toThrow(/duplicate/);
    expect(() => validateFoodLogsInput([base, { ...base, id: "meal-2", date: "2026-10-14" }])).toThrow(/one calendar date/);
    expect(() => validateFoodLogsInput([base, { ...base, id: "meal-2", meal: "dinner" }])).toThrow(/one meal type/);
  });
});
