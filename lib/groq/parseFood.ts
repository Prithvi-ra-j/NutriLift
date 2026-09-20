import { groq } from "./client";
import { AI_MODELS } from "./model-config";
import { safeGroqCall } from "./safeCall";

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
}

/**
 * Parse food text into structured nutrition data using Groq LLaMA
 */
export async function parseFoodFromText(text: string): Promise<FoodParseResult> {
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
          content: text,
        },
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 1000,
      response_format: { type: "json_object" }, // Force JSON response
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    
    // Parse and validate
    const result = JSON.parse(raw) as FoodParseResult;
    return validateFoodParseResult(result);
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
    name: item.name || "Unknown food",
    quantity: item.quantity || "1 serving",
    quantity_g: item.quantity_g ?? null,
    calories: Math.max(0, item.calories || 0),
    protein_g: Math.max(0, item.protein_g || 0),
    carbs_g: Math.max(0, item.carbs_g || 0),
    fat_g: Math.max(0, item.fat_g || 0),
    fiber_g: item.fiber_g ?? null,
    confidence: item.confidence || "medium",
  }));

  return result;
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
