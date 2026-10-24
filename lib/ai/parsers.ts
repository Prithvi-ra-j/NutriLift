import { ExerciseParseSchema, FoodParseSchema, InBodyParseSchema } from "./schemas";
import type {
  ExerciseParseResult,
  FoodParseResult,
  InBodyParseResult,
  ParsedFoodItem,
} from "./schemas";
import { requestStructured } from "./structured";
import { exerciseParsePrompt } from "./prompts/exercise-parse";
import { foodParsePrompt } from "./prompts/food-parse";
import { inbodyPrompt } from "./prompts/inbody";

export type {
  ExerciseParseResult,
  FoodParseResult,
  InBodyParseResult,
  ParsedFoodItem,
} from "./schemas";
export type ParsedSet = ExerciseParseResult["exercises"][number]["sets"][number];
export type ParsedExercise = ExerciseParseResult["exercises"][number];

export function parseFoodFromText(text: string): Promise<FoodParseResult> {
  return requestStructured(
    foodParsePrompt,
    text,
    FoodParseSchema,
  );
}

export async function parseFoodFromVoice(transcription: string): Promise<FoodParseResult> {
  const cleaned = transcription
    .toLowerCase()
    .replace(/\bi ate\b/gi, "")
    .replace(/\bi had\b/gi, "")
    .replace(/\bfor (breakfast|lunch|dinner|snack)\b/gi, "")
    .trim();
  return parseFoodFromText(cleaned);
}

export function parseExerciseFromText(text: string): Promise<ExerciseParseResult> {
  return requestStructured(
    exerciseParsePrompt,
    text,
    ExerciseParseSchema,
  );
}

export function parseInBodyText(text: string): Promise<InBodyParseResult> {
  return requestStructured(
    inbodyPrompt,
    text,
    InBodyParseSchema,
  );
}

export const parseFoodInput = parseFoodFromText;
export const parseExerciseInput = parseExerciseFromText;
export const parseInBodyInput = parseInBodyText;
