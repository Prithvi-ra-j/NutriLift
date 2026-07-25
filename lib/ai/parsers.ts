import { parseFoodFromText } from "../groq/parseFood";
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
