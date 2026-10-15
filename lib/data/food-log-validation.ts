import type { NewFoodLog } from "../db/schema";
import { fromLocalDateKey } from "../utils/local-date";

const VALID_MEALS = new Set(["breakfast", "lunch", "snack", "dinner"]);
const VALID_SOURCES = new Set(["manual", "voice", "paste", "barcode", "ai", "local", "repeat"]);
const VALID_PROVENANCE_TYPES = new Set(["user_entered", "verified_reference", "ai_estimated", "imported", "manual_override", "legacy_unknown"]);

export function validateFoodLogInput(log: NewFoodLog): void {
  if (!log.id?.trim()) throw new Error("Food log ID is required.");
  try { fromLocalDateKey(log.date); } catch { throw new Error("Food log date must be a valid YYYY-MM-DD calendar date."); }
  if (!VALID_MEALS.has(log.meal)) throw new Error("Choose a valid meal.");
  if (!log.name?.trim()) throw new Error("Food name is required.");
  if (!VALID_SOURCES.has(log.source)) throw new Error("Food source is invalid.");
  if (log.provenance_type != null && !VALID_PROVENANCE_TYPES.has(log.provenance_type)) throw new Error("Food provenance type is invalid.");
  if (log.estimate_confidence != null && (!Number.isFinite(log.estimate_confidence) || log.estimate_confidence < 0 || log.estimate_confidence > 1)) {
    throw new Error("Food estimate confidence must be between 0 and 1.");
  }
  if (log.estimate_reviewed != null && log.estimate_reviewed !== 0 && log.estimate_reviewed !== 1) {
    throw new Error("Food estimate review state is invalid.");
  }
  if (log.provenance_json != null) {
    if (log.provenance_json.length > 10000) throw new Error("Food provenance metadata is too large.");
    try {
      const parsed: unknown = JSON.parse(log.provenance_json);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Metadata must be an object.");
    } catch {
      throw new Error("Food provenance metadata must be valid JSON object data.");
    }
  }

  for (const [field, value] of Object.entries({
    calories: log.calories,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    fiber_g: log.fiber_g,
    quantity_g: log.quantity_g,
  })) {
    if (value == null) continue;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Food ${field} must be a finite, non-negative number.`);
    }
  }
  if (log.calories <= 0) {
    throw new Error("Calories must be greater than zero. Review the food estimate before saving.");
  }
  if (log.quantity_g != null && log.quantity_g <= 0) {
    throw new Error("Food quantity must be greater than zero.");
  }
}

export function validateFoodLogsInput(logs: NewFoodLog[]): void {
  if (logs.length === 0) throw new Error("Add at least one food item.");
  logs.forEach(validateFoodLogInput);
  if (new Set(logs.map((log) => log.id)).size !== logs.length) {
    throw new Error("Food log contains duplicate item IDs.");
  }
  if (new Set(logs.map((log) => log.date)).size !== 1) {
    throw new Error("A meal batch must use one calendar date.");
  }
  if (new Set(logs.map((log) => log.meal)).size !== 1) {
    throw new Error("A meal batch must use one meal type.");
  }
}
