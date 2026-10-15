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
  { meal: "snack", pattern: /\b(?:for\s+)?snacks?\b/i },
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
    // Aliases have already been normalized to letters, digits, and spaces, so
    // no regex escaping is needed. This keeps aliases with punctuation safe.
    if ((` ${normalized} `).includes(` ${candidate.normalizedAlias} `)) {
      return { food: candidate.food, alias: candidate.alias };
    }
  }
  return null;
}

function chooseServing(food: IndianFood, unit = ""): { label: string; grams: number } {
  const servings = food.commonServings;
  const patterns: Record<string, RegExp> = {
    cup: /\bcup\b/i,
    cups: /\bcup\b/i,
    bowl: /\bbowl\b/i,
    bowls: /\bbowl\b/i,
    scoop: /\bscoop\b/i,
    scoops: /\bscoop\b/i,
    tbsp: /\btbsp|tablespoon\b/i,
    tablespoon: /\btablespoon\b/i,
    tablespoons: /\btablespoon\b/i,
    tsp: /\btsp|teaspoon\b/i,
    teaspoon: /\bteaspoon\b/i,
    teaspoons: /\bteaspoon\b/i,
    serving: /\bserving|portion\b/i,
    servings: /\bserving|portion\b/i,
  };
  const pattern = patterns[unit];
  if (pattern) {
    const match = servings.find((serving) => pattern.test(serving.label));
    if (match) return match;
  }
  return servings.find((serving) => /medium|1 portion|1 serving/i.test(serving.label))
    ?? servings[0]
    ?? { label: "1 serving (100g)", grams: 100 };
}

function getQuantityGrams(segment: string, food: IndianFood): { grams: number; label: string } {
  const normalized = normalize(segment);
  const amountMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(kg|g|grams?|ml|cups?|bowls?|servings?|scoops?|tbsp|tablespoons?|tsp|teaspoons?)?\b/);
  if (!amountMatch) {
    const serving = chooseServing(food);
    return { grams: serving.grams, label: serving.label };
  }

  const amount = Number(amountMatch[1]);
  const unit = amountMatch[2] ?? "";
  if (!Number.isFinite(amount) || amount <= 0) {
    const serving = chooseServing(food);
    return { grams: serving.grams, label: serving.label };
  }

  if (unit === "kg") return { grams: amount * 1000, label: amount + " kg" };
  if (unit === "g" || unit.startsWith("gram")) return { grams: amount, label: amount + " g" };
  if (unit === "ml") return { grams: amount, label: amount + " ml (estimated as grams)" };

  const serving = chooseServing(food, unit);
  const labelUnit = unit || "serving";
  return {
    grams: amount * serving.grams,
    label: amount + " " + labelUnit + (amount === 1 ? "" : "s") + " (estimated)",
  };
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
