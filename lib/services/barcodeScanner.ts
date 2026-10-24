import { Platform } from "react-native";
import { logger } from "../logger";
import { num } from "../domain/barcode";

// API Configuration
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const USER_AGENT = process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL?.trim()
  ? `NutriLift/1.0.0 (${process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL.trim()})`
  : "NutriLift/1.0.0";

export interface FoodResult {
  status?: "NOT_FOUND";
  barcode: string;
  name: string;
  brand?: string;
  source: "openfoodfacts" | "cache";
  per100g: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
  };
  servingSize?: number | null;
  servingUnit?: string;
  dataQuality: "consistent" | "complete" | "partial" | "poor" | "unknown";
  warnings: string[];
}

export async function lookupBarcode(barcode: string): Promise<FoodResult> {
  logger.info("Looking up barcode", { barcode });

  // Step 1: Check local cache first (works offline)
  if (Platform.OS !== "web") {
    try {
      const { getBarcodeCache } = await import("../db/queries/barcode");
      const cached = await getBarcodeCache(barcode);
      if (cached) {
        logger.info("Barcode found in cache", { barcode });
        return cached;
      }
    } catch (error) {
      logger.warn("Cache lookup failed", { error });
    }
  }

  const result = await lookupOpenFoodFacts(barcode);
  if (Platform.OS !== "web") {
    const { saveBarcodeCache } = await import("../db/queries/barcode");
    await saveBarcodeCache(result);
  }
  return result;
}

async function lookupOpenFoodFacts(barcode: string): Promise<FoodResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${OFF_BASE}/${barcode}.json`, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Open Food Facts returned HTTP ${response.status}.`);
    }

    const data = await response.json() as {
      status?: number;
      product?: Record<string, unknown>;
    };

    if (data.status === 1 && data.product) {
      return validateAndNormalizeOFF(data.product, barcode);
    }

    return {
      status: "NOT_FOUND",
      barcode,
      name: "",
      source: "openfoodfacts",
      per100g: {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
      dataQuality: "unknown",
      warnings: [],
    };
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function validateAndNormalizeOFF(
  product: Record<string, unknown>,
  barcode: string,
): FoodResult {
  const nutrients =
    typeof product.nutriments === "object" && product.nutriments !== null
      ? product.nutriments as Record<string, unknown>
      : {};
  const calorie = num(nutrients["energy-kcal_100g"]);
  const protein = num(nutrients.proteins_100g);
  const carbs = num(nutrients.carbohydrates_100g);
  const fat = num(nutrients.fat_100g);
  const fiber = num(nutrients.fiber_100g);
  const sugar = num(nutrients.sugars_100g);
  const sodiumG = num(nutrients.sodium_100g);
  const result: FoodResult = {
    source: "openfoodfacts",
    barcode: typeof product.code === "string" ? product.code : barcode,
    name:
      (typeof product.product_name === "string" && product.product_name) ||
      (typeof product.product_name_en === "string" && product.product_name_en) ||
      "Unknown Product",
    brand: typeof product.brands === "string" ? product.brands : "",
    per100g: {
      calories: calorie,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium: sodiumG === null ? null : sodiumG * 1000,
    },
    servingSize: num(product.serving_size),
    servingUnit: typeof product.serving_size_unit === "string" ? product.serving_size_unit : "g",
    dataQuality: "unknown",
    warnings: [],
  };

  // VALIDATION RULES
  const calories = result.per100g.calories;

  // Rule 1: Macro-calorie consistency check
  if (calories !== null && protein !== null && carbs !== null && fat !== null) {
    const calculatedCals = protein * 4 + carbs * 4 + fat * 9;
    const variance = calories > 0 ? Math.abs(calculatedCals - calories) / calories : 0;
    if (variance > 0.2) {
      result.warnings.push(
        "Calorie count inconsistent with macros — verify label"
      );
      result.dataQuality = "complete";
    }
  }

  // Rule 2: Missing critical fields
  const missingFields = [];
  if (calories === null) missingFields.push("calories");
  if (protein === null) missingFields.push("protein");
  if (carbs === null) missingFields.push("carbs");
  if (fat === null) missingFields.push("fat");

  if (missingFields.length > 0) {
    result.warnings.push(
      `Missing: ${missingFields.join(", ")} — entry may be incomplete`
    );
    if (result.dataQuality !== "poor") {
      result.dataQuality = missingFields.length >= 3 ? "poor" : "partial";
    }
  }

  // Rule 3: Physiologically impossible values (per 100g)
  if (protein !== null && protein > 100)
    result.warnings.push("Protein value seems too high — check label");
  if (fat !== null && fat > 100)
    result.warnings.push("Fat value seems too high — check label");
  if (calories !== null && calories > 900)
    result.warnings.push(
      "Very high calorie density — verify this is per 100g"
    );
  if ((protein ?? 0) + (carbs ?? 0) + (fat ?? 0) > 105) {
    result.warnings.push("Macros exceed 100g — data error in source");
    result.dataQuality = "poor";
  }

  if (missingFields.length > 0) {
    result.dataQuality = missingFields.length >= 3 ? "poor" : "partial";
  } else if (result.dataQuality === "unknown") {
    result.dataQuality = "consistent";
  }

  return result;
}
