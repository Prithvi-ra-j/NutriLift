import { eq } from "drizzle-orm";
import { db } from "../client";
import { barcodeCache } from "../schema";
import type { FoodResult } from "../../services/barcodeScanner";

export async function getBarcodeCache(barcode: string): Promise<FoodResult | null> {
  try {
    const results = await db
      .select()
      .from(barcodeCache)
      .where(eq(barcodeCache.barcode, barcode))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const cached = results[0];

    // Update last_used timestamp
    await db
      .update(barcodeCache)
      .set({ last_used: Date.now() })
      .where(eq(barcodeCache.barcode, barcode));

    // Convert to FoodResult format
    return {
      barcode: cached.barcode,
      name: cached.name,
      brand: cached.brand || undefined,
      source: cached.source as "openfoodfacts" | "nutritionix" | "cache",
      per100g: {
        calories: cached.per100g_calories,
        protein: cached.per100g_protein,
        carbs: cached.per100g_carbs,
        fat: cached.per100g_fat,
        fiber: cached.per100g_fiber,
        sugar: cached.per100g_sugar,
        sodium: cached.per100g_sodium,
      },
      servingSize: cached.serving_size || undefined,
      servingUnit: cached.serving_unit || undefined,
      dataQuality: (cached.data_quality as any) || "unknown",
      warnings: cached.warnings ? JSON.parse(cached.warnings) : [],
    };
  } catch (error) {
    console.error("Failed to get barcode from cache:", error);
    return null;
  }
}

export async function saveBarcodeCache(result: FoodResult): Promise<void> {
  try {
    const now = Date.now();

    await db
      .insert(barcodeCache)
      .values({
        barcode: result.barcode,
        name: result.name,
        brand: result.brand || null,
        source: result.source,
        per100g_calories: result.per100g.calories,
        per100g_protein: result.per100g.protein,
        per100g_carbs: result.per100g.carbs,
        per100g_fat: result.per100g.fat,
        per100g_fiber: result.per100g.fiber,
        per100g_sugar: result.per100g.sugar,
        per100g_sodium: result.per100g.sodium,
        serving_size: result.servingSize || null,
        serving_unit: result.servingUnit || null,
        data_quality: result.dataQuality,
        warnings: JSON.stringify(result.warnings),
        cached_at: now,
        last_used: now,
      })
      .onConflictDoUpdate({
        target: barcodeCache.barcode,
        set: {
          name: result.name,
          brand: result.brand || null,
          source: result.source,
          per100g_calories: result.per100g.calories,
          per100g_protein: result.per100g.protein,
          per100g_carbs: result.per100g.carbs,
          per100g_fat: result.per100g.fat,
          per100g_fiber: result.per100g.fiber,
          per100g_sugar: result.per100g.sugar,
          per100g_sodium: result.per100g.sodium,
          serving_size: result.servingSize || null,
          serving_unit: result.servingUnit || null,
          data_quality: result.dataQuality,
          warnings: JSON.stringify(result.warnings),
          last_used: now,
        },
      });
  } catch (error) {
    console.error("Failed to save barcode to cache:", error);
    throw error;
  }
}

export async function clearOldCache(daysOld: number = 90): Promise<number> {
  try {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const result = await db
      .delete(barcodeCache)
      .where(eq(barcodeCache.last_used, cutoffTime));

    return result.rowsAffected || 0;
  } catch (error) {
    console.error("Failed to clear old cache:", error);
    return 0;
  }
}
