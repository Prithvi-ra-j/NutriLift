export const exerciseParsePrompt = {
  id: "exercise-parse",
  version: 1,
  build: () => `Extract exercises and sets from the user's workout text.
Return one JSON object with keys: exercises, day_type_suggestion, parse_notes.
Each exercise includes name, muscle_group, equipment, and sets.
Each set includes weight_kg, reps, rpe, and is_warmup. Use metric units and null when RPE is absent.
Do not infer unreported sets or values.`,
} as const;
