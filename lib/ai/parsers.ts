import { parseFoodFromText } from "../groq/parseFood";
import { parseExerciseFromText } from "../groq/parseExercise";
import { parseInBodyText } from "../groq/parseInBody";
import { INDIAN_FOOD_DB } from "../data/indianFoodDB";

// Re-export types for backward compatibility
export type {
  ParsedFoodItem,
  FoodParseResult,
} from "../groq/parseFood";

export type {
  ParsedSet,
  ParsedExercise,
  ExerciseParseResult,
} from "../groq/parseExercise";

export type {
  InBodyParseResult,
} from "../groq/parseInBody";

// ─── Parsers ──────────────────────────────────────────────────────────────────

export async function parseFoodInput(input: string) {
  const normalized = input.trim().toLowerCase();
  const local = INDIAN_FOOD_DB.find((food) => [food.name, ...food.aliases].some((name) => normalized.includes(name.toLowerCase())));
  if (local) {
    const serving = local.commonServings[1] ?? local.commonServings[0];
    const grams = serving?.grams ?? 100;
    const factor = grams / 100;
    return {
      items: [{
        name: local.name,
        quantity: serving?.label ?? `${grams}g`,
        quantity_g: grams,
        calories: local.per100g.calories * factor,
        protein_g: local.per100g.protein * factor,
        carbs_g: local.per100g.carbs * factor,
        fat_g: local.per100g.fat * factor,
        fiber_g: local.per100g.fiber * factor,
        confidence: "high" as const,
      }],
      meal_suggestion: null,
      parse_notes: "Matched a local food database entry; review the serving if needed.",
      source: "local" as const,
      original_input: input,
    };
  }
  try {
    return await parseFoodFromText(input);
  } catch (error) {
    throw new Error(`Food parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function parseExerciseInput(input: string) {
  try {
    return await parseExerciseFromText(input);
  } catch (error) {
    throw new Error(`Exercise parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Re-export for backward compatibility
export { parseInBodyText } from "../groq/parseInBody";

export async function parseInBodyInput(text: string) {
  try {
    return await parseInBodyText(text);
  } catch (error) {
    throw new Error(`InBody parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
