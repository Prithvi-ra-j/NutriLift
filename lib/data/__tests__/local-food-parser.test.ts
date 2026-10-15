import { parseFoodLocally } from "../local-food-parser";

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
