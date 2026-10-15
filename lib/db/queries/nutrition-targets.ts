import { desc, eq, lte } from "drizzle-orm";
import uuid from "react-native-uuid";
import { toLocalDateKey } from "../../utils/local-date";
import { db } from "../client";
import { nutritionProfile, nutritionTargetHistory } from "../schema";

import {
  DEFAULT_NUTRITION_TARGETS,
  validateNutritionTargets,
  type NutritionGoal,
  type NutritionTargetMode,
  type NutritionTargets,
} from "../../nutrition/target-validation";
export { DEFAULT_NUTRITION_TARGETS, validateNutritionTargets } from "../../nutrition/target-validation";
export type { NutritionGoal, NutritionTargetMode, NutritionTargets } from "../../nutrition/target-validation";

export interface NutritionTargetSaveOptions {
  effectiveDate?: string;
  source?: "manual" | "adaptive" | "migration";
  maintenanceEstimateKcal?: number | null;
  algorithmVersion?: string | null;
  explanation?: string | null;
}

function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function getNutritionTargets(): Promise<NutritionTargets> {
  try {
    const rows = await db.select().from(nutritionProfile).where(eq(nutritionProfile.id, 1)).limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_NUTRITION_TARGETS;
    const targets: NutritionTargets = {
      calories: row.calorie_target_kcal,
      protein_g: row.protein_target_g,
      carbs_g: row.carbs_target_g,
      fat_g: row.fat_target_g,
      goal: row.goal as NutritionGoal,
      mode: row.target_mode as NutritionTargetMode,
    };
    validateNutritionTargets(targets);
    return targets;
  } catch {
    // Web uses a no-op DB. Malformed persisted values should never leak into calculations.
    return DEFAULT_NUTRITION_TARGETS;
  }
}

export async function saveNutritionTargets(
  targets: NutritionTargets,
  options: NutritionTargetSaveOptions = {},
): Promise<void> {
  validateNutritionTargets(targets);
  const effectiveDate = options.effectiveDate ?? toLocalDateKey();
  if (!isValidDateKey(effectiveDate)) throw new Error("Effective date must be a real local calendar date (YYYY-MM-DD).");
  if (options.maintenanceEstimateKcal != null && (!Number.isFinite(options.maintenanceEstimateKcal) || options.maintenanceEstimateKcal <= 0)) {
    throw new Error("Maintenance estimate must be a positive finite number.");
  }

  const now = new Date().toISOString();
  const source = options.source ?? targets.mode;
  await db.transaction(async (tx: any) => {
    await tx.insert(nutritionProfile).values({
      id: 1,
      calorie_target_kcal: targets.calories,
      protein_target_g: targets.protein_g,
      carbs_target_g: targets.carbs_g,
      fat_target_g: targets.fat_g,
      goal: targets.goal,
      target_mode: targets.mode,
      updated_at: now,
    }).onConflictDoUpdate({
      target: nutritionProfile.id,
      set: {
        calorie_target_kcal: targets.calories,
        protein_target_g: targets.protein_g,
        carbs_target_g: targets.carbs_g,
        fat_target_g: targets.fat_g,
        goal: targets.goal,
        target_mode: targets.mode,
        updated_at: now,
      },
    });

    await tx.insert(nutritionTargetHistory).values({
      id: String(uuid.v4()),
      effective_date: effectiveDate,
      calorie_target_kcal: targets.calories,
      protein_target_g: targets.protein_g,
      carbs_target_g: targets.carbs_g,
      fat_target_g: targets.fat_g,
      source,
      goal: targets.goal,
      maintenance_estimate_kcal: options.maintenanceEstimateKcal ?? null,
      algorithm_version: options.algorithmVersion ?? null,
      explanation: options.explanation ?? null,
      created_at: now,
    });
  });
}

export async function getNutritionTargetsForDate(date: string): Promise<NutritionTargets> {
  if (!isValidDateKey(date)) throw new Error("Date must be a real calendar date (YYYY-MM-DD).");
  try {
    const rows = await db.select().from(nutritionTargetHistory)
      .where(lte(nutritionTargetHistory.effective_date, date))
      .orderBy(desc(nutritionTargetHistory.effective_date), desc(nutritionTargetHistory.created_at))
      .limit(1);
    const row = rows[0];
    if (row) {
      const active = await getNutritionTargets();
      return {
        calories: row.calorie_target_kcal,
        protein_g: row.protein_target_g,
        carbs_g: row.carbs_target_g,
        fat_g: row.fat_target_g,
        goal: row.goal === "lose" || row.goal === "maintain" || row.goal === "gain" ? row.goal : active.goal,
        mode: row.source === "adaptive" ? "adaptive" : "manual",
      };
    }
  } catch {
    return DEFAULT_NUTRITION_TARGETS;
  }
  return DEFAULT_NUTRITION_TARGETS;
}
