export interface ManualFoodEntryInput {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  quantity: string;
}

export interface ValidManualFoodEntry {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  quantity: number;
}

export type ManualFoodEntryValidation =
  | { valid: true; values: ValidManualFoodEntry }
  | { valid: false; message: string };

/** Validate user-entered per-100g nutrition before scaling and persisting it. */
export function validateManualFoodEntry(
  input: ManualFoodEntryInput,
): ManualFoodEntryValidation {
  if (!input.name.trim()) {
    return { valid: false, message: "Please enter a food name" };
  }

  const fields = [
    ["calories", input.calories],
    ["protein", input.protein],
    ["carbs", input.carbs],
    ["fat", input.fat],
    ["quantity", input.quantity],
  ] as const;
  const numbers: Record<string, number> = {};

  for (const [field, raw] of fields) {
    const value = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(value)) {
      return { valid: false, message: "Please enter valid numbers for all required fields" };
    }
    numbers[field] = value;
  }

  const fiberRaw = input.fiber.trim();
  const fiber = fiberRaw === "" ? null : Number(fiberRaw);
  if (fiber !== null && !Number.isFinite(fiber)) {
    return { valid: false, message: "Fiber must be a finite number or left blank" };
  }

  if (numbers.calories <= 0) {
    return { valid: false, message: "Calories must be greater than zero" };
  }
  if (numbers.quantity <= 0) {
    return { valid: false, message: "Quantity must be greater than zero" };
  }
  if (numbers.protein < 0 || numbers.carbs < 0 || numbers.fat < 0 || (fiber !== null && fiber < 0)) {
    return { valid: false, message: "Nutrition values cannot be negative" };
  }

  return {
    valid: true,
    values: {
      calories: numbers.calories,
      protein: numbers.protein,
      carbs: numbers.carbs,
      fat: numbers.fat,
      fiber,
      quantity: numbers.quantity,
    },
  };
}
