import { groq } from "./client";
import { AI_MODELS } from "./model-config";
import { safeGroqCall } from "./safeCall";

export interface ParsedSet {
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
}

export interface ParsedExercise {
  name: string;
  muscle_group: string;
  equipment: string;
  sets: ParsedSet[];
}

export interface ExerciseParseResult {
  exercises: ParsedExercise[];
  day_type_suggestion: string | null;
  parse_notes: string | null;
}

/**
 * Parse exercise input into structured workout data using Groq LLaMA
 */
export async function parseExerciseFromText(text: string): Promise<ExerciseParseResult> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: AI_MODELS.exercise_parse,
      messages: [
        {
          role: "system",
          content: `You are a strength training data extractor. Parse workout input and return structured exercise data.

ALWAYS respond with valid JSON only, no markdown, no explanation, no code blocks.

Use this exact schema:
{
  "exercises": [
    {
      "name": "string (standardized name e.g. 'Lat Pulldown', 'Leg Press')",
      "muscle_group": "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "glutes" | "core" | "calves",
      "equipment": "machine" | "barbell" | "dumbbell" | "cable" | "bodyweight",
      "sets": [
        {
          "weight_kg": number,
          "reps": number,
          "rpe": number or null,
          "is_warmup": boolean
        }
      ]
    }
  ],
  "day_type_suggestion": "Push A" | "Pull A" | "Legs A" | "Push B" | "Pull B" | "Legs B" | null,
  "parse_notes": "string or null"
}

Rules:
- Standardize exercise names (e.g., "lat pull down" → "Lat Pulldown")
- Identify muscle group based on exercise
- Detect equipment type from exercise name
- Parse all sets with weight and reps
- Mark first 1-2 sets as warmup if weight is significantly lower
- Suggest day type based on exercises (Push = chest/shoulders/triceps, Pull = back/biceps, Legs = quads/hamstrings/glutes)
- If RPE is mentioned (e.g., "@8 RPE"), extract it; otherwise null`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as ExerciseParseResult;
    return validateExerciseParseResult(result);
  }) as Promise<ExerciseParseResult>;
}

/**
 * Validate and sanitize exercise parse result
 */
function validateExerciseParseResult(result: ExerciseParseResult): ExerciseParseResult {
  if (!result.exercises || !Array.isArray(result.exercises)) {
    throw new Error("Invalid exercise parse result: missing exercises array");
  }

  // Ensure all required fields exist
  result.exercises = result.exercises.map((exercise) => ({
    name: exercise.name || "Unknown Exercise",
    muscle_group: exercise.muscle_group || "core",
    equipment: exercise.equipment || "bodyweight",
    sets: Array.isArray(exercise.sets)
      ? exercise.sets.map((set) => ({
          weight_kg: Math.max(0, set.weight_kg || 0),
          reps: Math.max(0, set.reps || 0),
          rpe: set.rpe ?? null,
          is_warmup: set.is_warmup ?? false,
        }))
      : [],
  }));

  return result;
}
