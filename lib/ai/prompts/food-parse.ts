export const foodParsePrompt = {
  id: "food-parse",
  version: 1,
  build: () => `Extract food items and estimated nutrition from the user's text.
Return one JSON object with keys: items, meal_suggestion, parse_notes.
Each item must include name, quantity, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g, and confidence.
Use a best central estimate and express uncertainty through the confidence field.
Use confidence high, medium, or low. Use null when quantity or fiber is unknown.
Do not invent foods or claim precision the description does not support.`,
} as const;
