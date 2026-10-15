jest.mock("../client", () => ({ db: {} }));

import { groupFoodLogsByMeal, getRecentFoods } from "../queries/nutrition";
import type { FoodLog } from "../schema";

function food(id: string, meal: string, name: string, calories: number, protein: number): FoodLog {
  return { id, date: "2026-10-15", meal, name, quantity_g: 100, calories, protein_g: protein, carbs_g: 10, fat_g: 5, fiber_g: null, sugar_g: null, sodium_mg: null, source: "manual", raw_input: null, created_at: 1 };
}

describe("meal summaries", () => {
  it("groups items by meal in day order and sums item-level nutrition", () => {
    const result = groupFoodLogsByMeal([
      food("1", "dinner", "Dal", 220, 12),
      food("2", "breakfast", "Eggs", 140, 13),
      food("3", "dinner", "Rice", 200, 4),
    ]);
    expect(result.map((meal) => meal.meal)).toEqual(["breakfast", "dinner"]);
    expect(result[1]).toMatchObject({ totalCalories: 420, totalProtein: 16, totalCarbs: 20, totalFat: 10 });
    expect(result[1].items).toHaveLength(2);
  });

  it("keeps legacy meal labels visible rather than dropping rows", () => {
    expect(groupFoodLogsByMeal([food("1", "late_meal", "Snack", 100, 3)])[0].meal).toBe("late_meal");
  });

  it("rejects invalid recent-food limits before querying storage", async () => {
    await expect(getRecentFoods("", 0)).rejects.toThrow("integer from 1 to 50");
  });
});
