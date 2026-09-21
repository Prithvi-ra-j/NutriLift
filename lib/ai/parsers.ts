import { parseFoodFromText } from "../groq/parseFood";
import { parseExerciseFromText } from "../groq/parseExercise";
import { parseInBodyText } from "../groq/parseInBody";
import { INDIAN_FOOD_DB } from "../data/indianFoodDB";
import { searchPersonalFoods } from "../db/queries/personal-foods";
import { getBarcodeCache } from "../db/queries/barcode";

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
  const normalized = input.trim().toLowerCase();
  if (/^\d{8,14}$/.test(normalized)) {
    const cached = await getBarcodeCache(normalized);
    if (cached && cached.name) {
      const grams = cached.servingSize || 100;
      const factor = grams / 100;
      return {
        items: [{ name: cached.name, quantity: String(grams) + (cached.servingUnit || "g"), quantity_g: grams, calories: (cached.per100g.calories || 0) * factor, protein_g: (cached.per100g.protein || 0) * factor, carbs_g: (cached.per100g.carbs || 0) * factor, fat_g: (cached.per100g.fat || 0) * factor, fiber_g: cached.per100g.fiber == null ? null : cached.per100g.fiber * factor, confidence: "high" as const }],
        meal_suggestion: null, parse_notes: "Matched a cached barcode product; review the serving if needed.", source: "local" as const, original_input: input,
      };
    }
  }
  const personalMatches = await searchPersonalFoods(normalized, 5);
  const personal = personalMatches.find(function(food) { return food.name.toLowerCase() === normalized; }) || (personalMatches.length === 1 ? personalMatches[0] : null);
  if (personal && personal.per100g_calories != null) {
    return {
      items: [{ name: personal.name, quantity: "100g", quantity_g: 100, calories: personal.per100g_calories, protein_g: personal.per100g_protein || 0, carbs_g: personal.per100g_carbs || 0, fat_g: personal.per100g_fat || 0, fiber_g: personal.per100g_fiber == null ? null : personal.per100g_fiber, confidence: "high" as const }],
      meal_suggestion: null, parse_notes: "Matched your personal food database; review the serving if needed.", source: "local" as const, original_input: input,
    };
  }
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
