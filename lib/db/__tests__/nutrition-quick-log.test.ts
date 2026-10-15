import { getFavoriteFoods, getRepeatableMeal, repeatMeal, saveRepeatableMeal } from "../queries/nutrition";

jest.mock("../client", () => ({ db: {} }));

describe("nutrition quick-log contracts", () => {
  it("bounds favourite and repeatable meal list sizes", async () => {
    await expect(getFavoriteFoods("", 0)).rejects.toThrow("Favorite food limit");
  });

  it("rejects invalid repeatable meal names, meal types, and empty templates", async () => {
    await expect(saveRepeatableMeal({ name: " ", meal: "breakfast", items: [{ name: "Oats", quantity_g: 50, calories: 190, protein_g: 6, carbs_g: 32, fat_g: 4 }] })).rejects.toThrow("name must contain");
    await expect(saveRepeatableMeal({ name: "Breakfast", meal: "brunch", items: [{ name: "Oats", quantity_g: 50, calories: 190, protein_g: 6, carbs_g: 32, fat_g: 4 }] })).rejects.toThrow("meal type is invalid");
    await expect(saveRepeatableMeal({ name: "Breakfast", meal: "breakfast", items: [] })).rejects.toThrow("between 1 and 50 items");
  });

  it("rejects non-finite or negative nutrient snapshots", async () => {
    await expect(saveRepeatableMeal({
      name: "Breakfast", meal: "breakfast",
      items: [{ name: "Oats", quantity_g: 50, calories: 190, protein_g: -1, carbs_g: 32, fat_g: 4 }],
    })).rejects.toThrow("protein_g must be finite and non-negative");
  });

  it("validates template identity and local date before database access", async () => {
    await expect(getRepeatableMeal(" ")).rejects.toThrow("id is required");
    await expect(repeatMeal("meal-1", "2026-02-30")).rejects.toThrow("real YYYY-MM-DD calendar date");
  });
});
