import { parseFoodFromText } from "../groq/parseFood";
import { parseFoodLocally } from "../data/local-food-parser";
import { parseExerciseFromText } from "../groq/parseExercise";
import { parseInBodyText } from "../groq/parseInBody";

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
  const local = parseFoodLocally(input);

  // The deterministic catalogue handles familiar foods without consuming AI quota.
  if (local.items.length > 0 && local.unresolved_items.length === 0) {
    return local;
  }

  // Use AI only when the local catalogue cannot resolve the whole input.
  try {
    const aiResult = await parseFoodFromText(input);
    return {
      ...aiResult,
      meal_suggestion: aiResult.meal_suggestion ?? local.meal_suggestion,
      parse_notes: [
        aiResult.parse_notes,
        local.unresolved_items.length
          ? `Review uncertain items: ${local.unresolved_items.join(", ")}.`
          : null,
      ].filter(Boolean).join(" ") || null,
    };
  } catch (error) {
    // Keep useful deterministic matches available even when AI is offline.
    if (local.items.length > 0) {
      return {
        ...local,
        parse_notes: `${local.parse_notes ?? ""} AI fallback unavailable; confirm all quantities. Unresolved: ${local.unresolved_items.join(", ") || "none"}.`.trim(),
      };
    }
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
