import type { NewFoodLog } from "../db/schema";

const VALID_MEALS = new Set(["breakfast", "lunch", "snack", "dinner"]);
const VALID_SOURCES = new Set(["manual", "voice", "paste", "barcode", "ai", "local"]);

export function validateFoodLogInput(log: NewFoodLog): void {
  if (!log.id?.trim()) throw new Error("Food log ID is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) throw new Error("Food log date must be YYYY-MM-DD.");
  if (!VALID_MEALS.has(log.meal)) throw new Error("Choose a valid meal.");
  if (!log.name?.trim()) throw new Error("Food name is required.");
  if (!VALID_SOURCES.has(log.source)) throw new Error("Food source is invalid.");

  for (const [field, value] of Object.entries({
    calories: log.calories,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    fiber_g: log.fiber_g,
    quantity_g: log.quantity_g,
  })) {
    if (value == null) continue;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Food ${field} must be a finite, non-negative number.`);
    }
  }
  if (log.calories <= 0) {
    throw new Error("Calories must be greater than zero. Review the food estimate before saving.");
  }
  if (log.quantity_g != null && log.quantity_g <= 0) {
    throw new Error("Food quantity must be greater than zero.");
  }
}
