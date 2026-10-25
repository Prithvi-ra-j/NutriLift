import { eq, lt } from "drizzle-orm";
import { db } from "../db/client";
import { barcodeCache } from "../db/schema";
import type { FoodResult } from "../../services/barcodeScanner";
import { inTx } from "../db/tx";
import { nowUnix } from "../../time/clock";

export async function getBarcodeCache(barcode: string): Promise<FoodResult | null> {
  const results = await db
    .select()
    .from(barcodeCache)
    .where(eq(barcodeCache.barcode, barcode))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const cached = results[0];
  const now = nowUnix() * 1000;
  if (cached.expires_at !== null && cached.expires_at <= now) {
    await inTx(async () => {
      await db.delete(barcodeCache).where(eq(barcodeCache.barcode, barcode));
    });
    return null;
  }

  await inTx(async () => {
    await db
      .update(barcodeCache)
      .set({ last_used: now })
      .where(eq(barcodeCache.barcode, barcode));
  });

  if (cached.cache_status === "not_found") {
    return {
      status: "NOT_FOUND",
      barcode,
      name: "",
      source: "cache",
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

  return {
    barcode: cached.barcode,
    name: cached.name,
    brand: cached.brand || undefined,
    source: "cache",
    per100g: {
      calories: cached.per100g_calories,
      protein: cached.per100g_protein,
      carbs: cached.per100g_carbs,
      fat: cached.per100g_fat,
      fiber: cached.per100g_fiber,
      sugar: cached.per100g_sugar,
      sodium: cached.per100g_sodium,
    },
    servingSize: cached.serving_size ?? undefined,
    servingUnit: cached.serving_unit || undefined,
    dataQuality:
      cached.data_quality === "consistent" ||
      cached.data_quality === "complete" ||
      cached.data_quality === "partial" ||
      cached.data_quality === "poor"
        ? cached.data_quality
        : "unknown",
    warnings: cached.warnings ? JSON.parse(cached.warnings) : [],
  };
}

export async function saveBarcodeCache(result: FoodResult): Promise<void> {
  await inTx(async () => {
    const now = nowUnix() * 1000;

    await db
      .insert(barcodeCache)
      .values({
        barcode: result.barcode,
        name: result.name,
        brand: result.brand ?? null,
        source: result.source,
        per100g_calories: result.per100g.calories,
        per100g_protein: result.per100g.protein,
        per100g_carbs: result.per100g.carbs,
        per100g_fat: result.per100g.fat,
        per100g_fiber: result.per100g.fiber,
        per100g_sugar: result.per100g.sugar,
        per100g_sodium: result.per100g.sodium,
        serving_size: result.servingSize ?? null,
        serving_unit: result.servingUnit || null,
        data_quality: result.dataQuality,
        warnings: JSON.stringify(result.warnings),
        cached_at: now,
        last_used: now,
        cache_status: result.status === "NOT_FOUND" ? "not_found" : "found",
        expires_at: result.status === "NOT_FOUND" ? now + 60 * 60 * 1000 : null,
      })
      .onConflictDoUpdate({
        target: barcodeCache.barcode,
        set: {
          name: result.name,
          brand: result.brand ?? null,
          source: result.source,
          per100g_calories: result.per100g.calories,
          per100g_protein: result.per100g.protein,
          per100g_carbs: result.per100g.carbs,
          per100g_fat: result.per100g.fat,
          per100g_fiber: result.per100g.fiber,
          per100g_sugar: result.per100g.sugar,
          per100g_sodium: result.per100g.sodium,
          serving_size: result.servingSize ?? null,
          serving_unit: result.servingUnit || null,
          data_quality: result.dataQuality,
          warnings: JSON.stringify(result.warnings),
          cache_status: result.status === "NOT_FOUND" ? "not_found" : "found",
          expires_at: result.status === "NOT_FOUND" ? now + 60 * 60 * 1000 : null,
          last_used: now,
        },
      });
  });
}

export async function clearOldCache(daysOld: number = 90): Promise<number> {
  const cutoffTime = (nowUnix() - daysOld * 24 * 60 * 60) * 1000;
  return inTx(async () => {
    const result = await db
      .delete(barcodeCache)
      .where(lt(barcodeCache.last_used, cutoffTime));

    return result.changes;
  });
}
