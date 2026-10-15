import { parseFoodFromText } from "../groq/parseFood";
import { parseFoodLocally } from "../data/local-food-parser";
import { parseExerciseFromText } from "../groq/parseExercise";
import { parseInBodyText } from "../groq/parseInBody";
import { recordAIRequestMetrics } from "../observability/telemetry";

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

async function trackedAIParser<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    try {
      await recordAIRequestMetrics({ provider: "groq", latencyMs: Date.now() - startedAt, outputValid: result != null });
    } catch { /* Telemetry failures must not change parser results. */ }
    return result;
  } catch (error) {
    try {
      await recordAIRequestMetrics({ provider: "groq", latencyMs: Date.now() - startedAt, outputValid: false, failureCategory: operation + "_failed" });
    } catch { /* Telemetry failures must not replace parser failures. */ }
    throw error;
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export async function parseFoodInput(input: string) {
  const local = parseFoodLocally(input);

  // The deterministic catalogue handles familiar foods without consuming AI quota.
  if (local.items.length > 0 && local.unresolved_items.length === 0) {
    return local;
  }

  // Use AI only when the local catalogue cannot resolve the whole input.
  try {
    const aiResult = await trackedAIParser("food_parse", () => parseFoodFromText(input));
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
    return await trackedAIParser("exercise_parse", () => parseExerciseFromText(input));
  } catch (error) {
    throw new Error(`Exercise parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Re-export for backward compatibility
export { parseInBodyText } from "../groq/parseInBody";

export async function parseInBodyInput(text: string) {
  try {
    return await trackedAIParser("inbody_parse", () => parseInBodyText(text));
  } catch (error) {
    throw new Error(`InBody parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
