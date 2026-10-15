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

export function resolveFoodDefinition(candidate: string): { food: IndianFood; alias: string } | null {
  if (!candidate.trim()) return null;
  return findFood(candidate);
}

export interface NormalizedServing {
  grams: number;
  label: string;
  isEstimated: boolean;
}

export function normalizeServing(input: { food: IndianFood; quantity: number; unit?: string | null }): NormalizedServing {
  const { food } = input;
  const quantity = input.quantity;
  const unit = (input.unit ?? "").toLowerCase().trim();
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Serving quantity must be finite and greater than zero.");
  if (unit === "kg") return { grams: quantity * 1000, label: quantity + " kg", isEstimated: false };
  if (unit === "g" || unit === "gram" || unit === "grams") return { grams: quantity, label: quantity + " g", isEstimated: false };
  if (unit === "ml") return { grams: quantity, label: quantity + " ml (estimated as grams)", isEstimated: true };
  const serving = chooseServing(food, unit);
  if (!unit) return { grams: quantity * serving.grams, label: quantity === 1 ? serving.label : quantity + " servings (" + Math.round(quantity * serving.grams) + "g)", isEstimated: true };
  return {
    grams: quantity * serving.grams,
    label: quantity + " " + unit + (quantity === 1 ? "" : "s") + " (estimated)",
    isEstimated: true,
  };
}

export function calculateFoodNutrition(input: { food: IndianFood; normalizedServing: Pick<NormalizedServing, "grams"> }): {
  calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number;
} {
  if (!Number.isFinite(input.normalizedServing.grams) || input.normalizedServing.grams <= 0) {
    throw new Error("Normalized serving grams must be finite and greater than zero.");
  }
  const factor = input.normalizedServing.grams / 100;
  const macros = input.food.per100g;
  return {
    calories: round(macros.calories * factor),
    protein_g: round(macros.protein * factor),
    carbs_g: round(macros.carbs * factor),
    fat_g: round(macros.fat * factor),
    fiber_g: round(macros.fiber * factor),
  };
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
  const amountMatch = normalized.match(/^(\\d+(?:\\.\\d+)?)\\s*(kg|g|grams?|ml|cups?|bowls?|servings?|scoops?|tbsp|tablespoons?|tsp|teaspoons?)?\\b/);
  const amount = amountMatch ? Number(amountMatch[1]) : 1;
  const unit = amountMatch?.[2] ?? "";
  const serving = normalizeServing({ food, quantity: Number.isFinite(amount) && amount > 0 ? amount : 1, unit });
  return { grams: serving.grams, label: serving.label };
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
    const match = resolveFoodDefinition(segment);
    if (!match) {
      unresolved_items.push(segment);
      continue;
    }

    const { grams, label } = getQuantityGrams(segment, match.food);
    const nutrition = calculateFoodNutrition({ food: match.food, normalizedServing: { grams } });
    items.push({
      name: match.food.name,
      quantity: label,
      quantity_g: grams,
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
      carbs_g: nutrition.carbs_g,
      fat_g: nutrition.fat_g,
      fiber_g: nutrition.fiber_g,
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
