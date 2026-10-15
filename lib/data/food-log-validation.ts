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

export interface NutritionEstimateValidationInput {
  name: string;
  quantity_g?: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  provenance_type?: string | null;
  estimate_confidence?: number | null;
  estimate_reviewed?: number;
  provenance_json?: string | null;
}

export interface NutritionEstimateValidationResult {
  valid: boolean;
  errors: string[];
  requiresReview: boolean;
  confidenceBand: "unknown" | "low" | "medium" | "high";
}

/** Validate a nutrition estimate without pretending heuristic confidence is a calibrated probability. */
export function validateNutritionEstimate(input: NutritionEstimateValidationInput): NutritionEstimateValidationResult {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Food name is required.");
  for (const [field, value] of Object.entries({
    quantity_g: input.quantity_g,
    calories: input.calories,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g,
  })) {
    if (value != null && (!Number.isFinite(value) || value < 0)) errors.push(field + " must be finite and non-negative.");
  }
  if (!(input.calories > 0)) errors.push("Calories must be greater than zero.");
  if (input.quantity_g != null && input.quantity_g <= 0) errors.push("Food quantity must be greater than zero.");
  if (input.provenance_type != null && !VALID_PROVENANCE_TYPES.has(input.provenance_type)) errors.push("Food provenance type is invalid.");
  if (input.estimate_confidence != null && (!Number.isFinite(input.estimate_confidence) || input.estimate_confidence < 0 || input.estimate_confidence > 1)) {
    errors.push("Food estimate confidence must be between 0 and 1.");
  }
  if (input.estimate_reviewed != null && input.estimate_reviewed !== 0 && input.estimate_reviewed !== 1) errors.push("Food estimate review state is invalid.");
  if (input.provenance_json != null) {
    try {
      const parsed: unknown = JSON.parse(input.provenance_json);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || input.provenance_json.length > 10000) throw new Error("invalid");
    } catch {
      errors.push("Food provenance metadata must be a valid JSON object under 10 KB.");
    }
  }
  const confidence = input.estimate_confidence;
  const confidenceBand = confidence == null ? "unknown" : confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low";
  return {
    valid: errors.length === 0,
    errors,
    requiresReview: input.provenance_type === "ai_estimated" && input.estimate_reviewed !== 1,
    confidenceBand,
  };
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
