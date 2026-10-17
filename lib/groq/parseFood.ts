import { groq } from "./client";
import { AI_MODELS } from "./model-config";
import { safeGroqCall } from "./safeCall";
import { parseFoodLocally } from "../data/local-food-parser";

export interface ParsedFoodItem {
  name: string;
  quantity: string;
  quantity_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  confidence: "high" | "medium" | "low";
}

export interface FoodParseResult {
  items: ParsedFoodItem[];
  meal_suggestion: "breakfast" | "lunch" | "snack" | "dinner" | null;
  parse_notes: string | null;
  unresolved_items?: string[];
  source?: "local" | "ai";
  local_date?: string;
  locale?: string;
}

/**
 * Parse food text into structured nutrition data using Groq LLaMA
 */
export async function parseFoodFromText(text: string, options: { locale?: string } = {}): Promise<FoodParseResult> {
  const input = text.trim();
  if (!input) {
    throw new Error("Enter the foods you ate before parsing.");
  }

  // Prefer deterministic local nutrition for fully recognized items. This avoids
  // spending AI quota for simple meals and keeps the numeric source inspectable.
  const localResult = parseFoodLocally(input);
  if (localResult.items.length > 0 && localResult.unresolved_items.length === 0) {
    return { ...localResult, source: "local" };
  }

  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: AI_MODELS.food_parse,
      messages: [
        {
          role: "system",
          content: `You are a precision nutrition parser. Extract food items and their macros from user input. Focus on Indian foods, common meals, and Hinglish descriptions.

ALWAYS respond with valid JSON only, no markdown, no explanation, no code blocks.

Use this exact schema:
{
  "items": [
    {
      "name": "food name",
      "quantity": "amount with unit (e.g. '4 whole eggs', '1 cup')",
      "quantity_g": number or null,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number or null,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "meal_suggestion": "breakfast" | "lunch" | "snack" | "dinner" | null,
  "parse_notes": "string or null (flag anything uncertain)"
}

Indian food reference (per serving):
- 1 medium roti (30g) = 80 kcal, 3g protein, 15g carbs, 1g fat
- 1 cup cooked dal (230g) = 180 kcal, 12g protein, 30g carbs, 1g fat
- 1 cup cooked rice (200g) = 260 kcal, 5g protein, 55g carbs, 0.5g fat
- 1 whole egg = 70 kcal, 6g protein, 0.5g carbs, 5g fat
- 1 egg white = 17 kcal, 3.6g protein, 0g carbs, 0g fat
- 1 scoop whey protein = 120 kcal, 24g protein, 3g carbs, 1g fat
- 2 tbsp peanut butter = 190 kcal, 8g protein, 7g carbs, 15g fat
- 50g oats = 185 kcal, 7g protein, 30g carbs, 3g fat
- 30g roasted chana = 100 kcal, 7g protein, 15g carbs, 2g fat
- 1 cup curd/yogurt (200g) = 100 kcal, 6g protein, 8g carbs, 4g fat
- 1 banana (medium) = 105 kcal, 1g protein, 27g carbs, 0g fat
- 100g chicken breast = 165 kcal, 31g protein, 0g carbs, 3.6g fat
- 100g paneer = 265 kcal, 18g protein, 4g carbs, 20g fat

Rules:
- Be conservative with estimates — overestimating is better than underestimating for body recomp
- If quantity is unclear, use standard serving sizes
- For mixed dishes (sabji, curry), estimate based on main ingredients
- Mark confidence as "low" if the description is vague`,
        },
        {
          role: "user",
          content: options.locale ? "Locale: " + options.locale + "\nFood description: " + input : input,
        },
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 1000,
      response_format: { type: "json_object" }, // Force JSON response
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    
    // Parse and validate
    const result = validateFoodParseResult(JSON.parse(raw) as FoodParseResult);
    return {
      ...result,
      meal_suggestion: result.meal_suggestion ?? localResult.meal_suggestion,
      parse_notes: [result.parse_notes, localResult.unresolved_items.length ? `Local catalogue could not identify: ${localResult.unresolved_items.join(", ")}.` : null].filter(Boolean).join(" ") || null,
      unresolved_items: localResult.unresolved_items,
      source: "ai",
    };
  }) as Promise<FoodParseResult>;
}

/**
 * Validate and sanitize food parse result
 */
function validateFoodParseResult(result: FoodParseResult): FoodParseResult {
  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Invalid food parse result: missing items array");
  }

  // Ensure all required fields exist with defaults
  result.items = result.items.map((item) => ({
    name: typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 120) : "Unknown food",
    quantity: typeof item.quantity === "string" && item.quantity.trim() ? item.quantity.trim().slice(0, 80) : "1 serving",
    quantity_g: finiteNonNegative(item.quantity_g),
    calories: finiteNonNegative(item.calories) ?? 0,
    protein_g: finiteNonNegative(item.protein_g) ?? 0,
    carbs_g: finiteNonNegative(item.carbs_g) ?? 0,
    fat_g: finiteNonNegative(item.fat_g) ?? 0,
    fiber_g: finiteNonNegative(item.fiber_g),
    confidence: item.confidence === "high" || item.confidence === "low" ? item.confidence : "medium",
  }));

  if (result.items.length > 30) {
    throw new Error("Too many food items in one parse. Split the meal into smaller entries.");
  }
  const validMeals = ["breakfast", "lunch", "snack", "dinner"];
  result.meal_suggestion = validMeals.includes(String(result.meal_suggestion))
    ? result.meal_suggestion
    : null;
  result.parse_notes = typeof result.parse_notes === "string" ? result.parse_notes.slice(0, 500) : null;
  return result;
}

function finiteNonNegative(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.min(value, 1_000_000);
}

/**
 * Parse food from voice transcription
 * This is a convenience wrapper that handles common voice transcription issues
 */
export async function parseFoodFromVoice(transcription: string): Promise<FoodParseResult> {
  // Clean up common transcription issues
  const cleaned = transcription
    .toLowerCase()
    .replace(/\bi ate\b/gi, "")
    .replace(/\bi had\b/gi, "")
    .replace(/\bfor (breakfast|lunch|dinner|snack)\b/gi, "")
    .trim();

  return parseFoodFromText(cleaned);
}
