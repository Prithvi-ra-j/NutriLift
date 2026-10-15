import { INDIAN_FOOD_DB, type IndianFood } from "./indianFoodDB";
import type { FoodParseResult, ParsedFoodItem } from "../groq/parseFood";

export interface LocalFoodParseResult extends FoodParseResult {
  unresolved_items: string[];
  source: "local";
}

const MEAL_CUES: Array<{ meal: NonNullable<FoodParseResult["meal_suggestion"]>; pattern: RegExp }> = [
  { meal: "breakfast", pattern: /\b(?:for\s+)?breakfast\b/i },
  { meal: "lunch", pattern: /\b(?:for\s+)?lunch\b/i },
  { meal: "dinner", pattern: /\b(?:for\s+)?dinner\b/i },
  { meal: "snack", pattern: /\b(?:for\s+)?snack(?:s)?\b/i },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function findFood(segment: string): { food: IndianFood; alias: string } | null {
  const normalized = normalize(segment);
  const candidates = INDIAN_FOOD_DB.flatMap((food) =>
    [food.name, ...food.aliases].map((alias) => ({ food, alias, normalizedAlias: normalize(alias) })),
  ).sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);

  for (const candidate of candidates) {
    if (!candidate.normalizedAlias) continue;
    const escaped = candidate.normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\s)${escaped}(?=$|\s)`, "i").test(normalized)) {
      return { food: candidate.food, alias: candidate.alias };
    }
  }
  return null;
}

function getQuantityGrams(segment: string, food: IndianFood): { grams: number; label: string } {
  const normalized = normalize(segment);
  const amountMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(kg|g|grams?|ml|cups?|bowls?|servings?|scoops?|tbsp|tablespoons?|tsp|teaspoons?)?\\b/);
  if (!amountMatch) {
    const serving = food.commonServings.find((item) => /medium|1 portion|1 cup|1 bowl/i.test(item.label)) ?? food.commonServings[0] ?? { label: "1 serving (100g)", grams: 100 };
    return { grams: serving.grams, label: serving.label };
  }

  const amount = Number(amountMatch[1]);
  const unit = amountMatch[2] ?? "";
  if (!Number.isFinite(amount) || amount <= 0) {
    const serving = food.commonServings[0] ?? { label: "1 serving (100g)", grams: 100 };
    return { grams: serving.grams, label: serving.label };
  }

  if (unit === "kg") return { grams: amount * 1000, label: `${amount} kg` };
  if (unit === "g" || unit.startsWith("gram")) return { grams: amount, label: `${amount} g` };
  if (unit === "ml") return { grams: amount, label: `${amount} ml (estimated as grams)` };

  const count = amount;
  const serving = food.commonServings[0] ?? { label: "1 serving (100g)", grams: 100 };
  const unitMultiplier: Record<string, number> = {
    cup: 1, cups: 1, bowl: 1, bowls: 1, serving: 1, servings: 1,
    scoop: 1, scoops: 1, tbsp: 1, tablespoon: 1, tablespoons: 1, tsp: 1, teaspoon: 1, teaspoons: 1,
  };
  // Food counts such as "2 eggs" use the first serving weight; explicit kitchen
  // measures also use the starter catalogue's first serving as a conservative estimate.
  const multiplier = unitMultiplier[unit] ?? 1;
  return { grams: count * serving.grams * multiplier, label: `${amount} ${unit || "serving"}${amount === 1 ? "" : "s"} (estimated)` };
}

function splitFoodSegments(input: string): string[] {
  return input
    .replace(/\b(?:for\s+)?(?:breakfast|lunch|dinner|snacks?)\b/gi, " ")
    .split(/,|;|\band\b|\bplus\b|\bwith\b/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseFoodLocally(input: string): LocalFoodParseResult {
  const text = input.trim();
  if (!text) {
    return { items: [], meal_suggestion: null, parse_notes: "Enter the foods you ate.", unresolved_items: [], source: "local" };
  }

  const meal_suggestion = MEAL_CUES.find(({ pattern }) => pattern.test(text))?.meal ?? null;
  const segments = splitFoodSegments(text);
  const items: ParsedFoodItem[] = [];
  const unresolved_items: string[] = [];

  for (const segment of segments) {
    const match = findFood(segment);
    if (!match) {
      unresolved_items.push(segment);
      continue;
    }

    const { grams, label } = getQuantityGrams(segment, match.food);
    const factor = grams / 100;
    const macros = match.food.per100g;
    items.push({
      name: match.food.name,
      quantity: label,
      quantity_g: grams,
      calories: round(macros.calories * factor),
      protein_g: round(macros.protein * factor),
      carbs_g: round(macros.carbs * factor),
      fat_g: round(macros.fat * factor),
      fiber_g: round(macros.fiber * factor),
      confidence: match.food.dataQuality === "verified" ? "high" : "medium",
    });
  }

  return {
    items,
    meal_suggestion,
    parse_notes: items.length
      ? "Local estimates; recipe, brand, and portion size can change nutrition. Review before saving."
      : "No catalogue matches found. AI parsing may help if configured.",
    unresolved_items,
    source: "local",
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
