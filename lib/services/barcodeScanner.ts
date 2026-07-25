import { Platform } from "react-native";
import { logger } from "../logger";

// API Configuration
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const NUTRITIONIX_BASE = "https://trackapi.nutritionix.com/v2";

// Get from .env or use empty strings (will fail gracefully)
const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID || "";
const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY || "";

export interface FoodResult {
  status?: "NOT_FOUND";
  barcode: string;
  name: string;
  brand?: string;
  source: "openfoodfacts" | "nutritionix" | "cache";
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
  dataQuality: "verified" | "partial" | "suspect" | "poor" | "unknown";
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

  // Step 2: Try Open Food Facts
  try {
    const result = await lookupOpenFoodFacts(barcode);
    if (result.status !== "NOT_FOUND") {
      // Cache the result
      if (Platform.OS !== "web") {
        try {
          const { saveBarcodeCache } = await import("../db/queries/barcode");
          await saveBarcodeCache(result);
        } catch (error) {
          logger.warn("Failed to cache barcode", { error });
        }
      }
      return result;
    }
  } catch (error) {
    logger.warn("Open Food Facts lookup failed", { error });
  }

  // Step 3: Try Nutritionix fallback
  if (NUTRITIONIX_APP_ID && NUTRITIONIX_APP_KEY) {
    try {
      const result = await lookupNutritionix(barcode);
      if (result.status !== "NOT_FOUND") {
        // Cache the result
        if (Platform.OS !== "web") {
          try {
            const { saveBarcodeCache } = await import("../db/queries/barcode");
            await saveBarcodeCache(result);
          } catch (error) {
            logger.warn("Failed to cache barcode", { error });
          }
        }
        return result;
      }
    } catch (error) {
      logger.warn("Nutritionix lookup failed", { error });
    }
  }

  // Step 4: Both failed
  logger.info("Barcode not found in any database", { barcode });
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
}

async function lookupOpenFoodFacts(barcode: string): Promise<FoodResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${OFF_BASE}/${barcode}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (data.status === 1 && data.product) {
      return validateAndNormalizeOFF(data.product);
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
    clearTimeout(timeout);
    throw error;
  }
}

async function lookupNutritionix(barcode: string): Promise<FoodResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${NUTRITIONIX_BASE}/search/item?upc=${barcode}`, {
      headers: {
        "x-app-id": NUTRITIONIX_APP_ID,
        "x-app-key": NUTRITIONIX_APP_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (data.foods && data.foods[0]) {
      return validateAndNormalizeNutritionix(data.foods[0], barcode);
    }

    return {
      status: "NOT_FOUND",
      barcode,
      name: "",
      source: "nutritionix",
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
    clearTimeout(timeout);
    throw error;
  }
}

function validateAndNormalizeOFF(product: any): FoodResult {
  const result: FoodResult = {
    source: "openfoodfacts",
    barcode: product.code,
    name: product.product_name || product.product_name_en || "Unknown Product",
    brand: product.brands || "",
    per100g: {
      calories: parseFloat(product.nutriments?.["energy-kcal_100g"]) || null,
      protein: parseFloat(product.nutriments?.proteins_100g) || null,
      carbs: parseFloat(product.nutriments?.carbohydrates_100g) || null,
      fat: parseFloat(product.nutriments?.fat_100g) || null,
      fiber: parseFloat(product.nutriments?.fiber_100g) || null,
      sugar: parseFloat(product.nutriments?.sugars_100g) || null,
      sodium: parseFloat(product.nutriments?.sodium_100g) || null,
    },
    servingSize: parseFloat(product.serving_size) || null,
    servingUnit: product.serving_size_unit || "g",
    dataQuality: "unknown",
    warnings: [],
  };

  // VALIDATION RULES
  const { calories, protein, carbs, fat } = result.per100g;

  // Rule 1: Macro-calorie consistency check
  if (calories && protein !== null && carbs !== null && fat !== null) {
    const calculatedCals = protein * 4 + carbs * 4 + fat * 9;
    const variance = Math.abs(calculatedCals - calories) / calories;
    if (variance > 0.15) {
      // >15% discrepancy
      result.warnings.push(
        "Calorie count inconsistent with macros — verify label"
      );
      result.dataQuality = "suspect";
    }
  }

  // Rule 2: Missing critical fields
  const missingFields = [];
  if (!calories) missingFields.push("calories");
  if (protein === null) missingFields.push("protein");
  if (carbs === null) missingFields.push("carbs");
  if (fat === null) missingFields.push("fat");

  if (missingFields.length > 0) {
    result.warnings.push(
      `Missing: ${missingFields.join(", ")} — entry may be incomplete`
    );
    result.dataQuality = missingFields.length >= 3 ? "poor" : "partial";
  }

  // Rule 3: Physiologically impossible values (per 100g)
  if (protein && protein > 100)
    result.warnings.push("Protein value seems too high — check label");
  if (fat && fat > 100)
    result.warnings.push("Fat value seems too high — check label");
  if (calories && calories > 900)
    result.warnings.push(
      "Very high calorie density — verify this is per 100g"
    );
  if ((protein || 0) + (carbs || 0) + (fat || 0) > 105) {
    result.warnings.push("Macros exceed 100g — data error in source");
    result.dataQuality = "suspect";
  }

  // Rule 4: Set quality score
  if (result.warnings.length === 0 && result.dataQuality === "unknown") {
    result.dataQuality = "verified";
  }

  return result;
}

function validateAndNormalizeNutritionix(food: any, barcode: string): FoodResult {
  // Nutritionix provides per-serving data, need to convert to per 100g
  const servingWeight = food.serving_weight_grams || 100;
  const factor = 100 / servingWeight;

  const result: FoodResult = {
    source: "nutritionix",
    barcode,
    name: food.food_name || "Unknown Product",
    brand: food.brand_name || "",
    per100g: {
      calories: food.nf_calories ? food.nf_calories * factor : null,
      protein: food.nf_protein ? food.nf_protein * factor : null,
      carbs: food.nf_total_carbohydrate
        ? food.nf_total_carbohydrate * factor
        : null,
      fat: food.nf_total_fat ? food.nf_total_fat * factor : null,
      fiber: food.nf_dietary_fiber ? food.nf_dietary_fiber * factor : null,
      sugar: food.nf_sugars ? food.nf_sugars * factor : null,
      sodium: food.nf_sodium ? food.nf_sodium * factor : null,
    },
    servingSize: servingWeight,
    servingUnit: "g",
    dataQuality: "unknown",
    warnings: [],
  };

  // Apply same validation rules as OFF
  const { calories, protein, carbs, fat } = result.per100g;

  if (calories && protein !== null && carbs !== null && fat !== null) {
    const calculatedCals = protein * 4 + carbs * 4 + fat * 9;
    const variance = Math.abs(calculatedCals - calories) / calories;
    if (variance > 0.15) {
      result.warnings.push(
        "Calorie count inconsistent with macros — verify label"
      );
      result.dataQuality = "suspect";
    }
  }

  const missingFields = [];
  if (!calories) missingFields.push("calories");
  if (protein === null) missingFields.push("protein");
  if (carbs === null) missingFields.push("carbs");
  if (fat === null) missingFields.push("fat");

  if (missingFields.length > 0) {
    result.warnings.push(
      `Missing: ${missingFields.join(", ")} — entry may be incomplete`
    );
    result.dataQuality = missingFields.length >= 3 ? "poor" : "partial";
  }

  if (protein && protein > 100)
    result.warnings.push("Protein value seems too high — check label");
  if (fat && fat > 100)
    result.warnings.push("Fat value seems too high — check label");
  if (calories && calories > 900)
    result.warnings.push(
      "Very high calorie density — verify this is per 100g"
    );
  if ((protein || 0) + (carbs || 0) + (fat || 0) > 105) {
    result.warnings.push("Macros exceed 100g — data error in source");
    result.dataQuality = "suspect";
  }

  if (result.warnings.length === 0 && result.dataQuality === "unknown") {
    result.dataQuality = "verified";
  }

  return result;
}
