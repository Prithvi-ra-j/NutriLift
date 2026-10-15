import { desc, eq, gte, lte } from "drizzle-orm";
import uuid from "react-native-uuid";
import { toLocalDateKey } from "../../utils/local-date";
import { db } from "../client";
import { dailyNutrition, nutritionProfile, nutritionTargetHistory } from "../schema";
import { calculateTargetComparison } from "../../nutrition/target-validation";
import { enqueueDailyNutrition } from "./sync-outbox";

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
  algorithmVersion?: number | null;
  explanation?: string | null;
}

function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function getNutritionTargets(executor: any = db): Promise<NutritionTargets> {
  try {
    const rows = await executor.select().from(nutritionProfile).where(eq(nutritionProfile.id, 1)).limit(1);
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

    // A target change affects comparisons from its effective date forward, but
    // never rewrites actual food totals. Refresh all already-logged affected days
    // in the same transaction so the UI cannot observe half-applied target state.
    const affectedDays = await tx.select().from(dailyNutrition)
      .where(gte(dailyNutrition.date, effectiveDate))
      .orderBy(dailyNutrition.date);

    for (const day of affectedDays) {
      const versions = await tx.select().from(nutritionTargetHistory)
        .where(lte(nutritionTargetHistory.effective_date, day.date))
        .orderBy(desc(nutritionTargetHistory.effective_date), desc(nutritionTargetHistory.created_at))
        .limit(1);
      const version = versions[0];
      const effectiveTargets: NutritionTargets = version ? {
        calories: version.calorie_target_kcal,
        protein_g: version.protein_target_g,
        carbs_g: version.carbs_target_g,
        fat_g: version.fat_target_g,
        goal: version.goal === "lose" || version.goal === "maintain" || version.goal === "gain"
          ? version.goal
          : targets.goal,
        mode: version.source === "adaptive" ? "adaptive" : "manual",
      } : targets;
      const comparison = calculateTargetComparison({
        total_calories: day.total_calories,
        total_protein_g: day.total_protein_g,
      }, effectiveTargets);

      await tx.update(dailyNutrition).set({
        ...comparison,
        updated_at: now,
      }).where(eq(dailyNutrition.date, day.date));
      const persistedSummary = await tx.select().from(dailyNutrition)
        .where(eq(dailyNutrition.date, day.date)).limit(1);
      if (persistedSummary[0]) await enqueueDailyNutrition(tx, persistedSummary[0]);
    }
  });
}

export async function getNutritionTargetsForDate(date: string, executor: any = db): Promise<NutritionTargets> {
  if (!isValidDateKey(date)) throw new Error("Date must be a real calendar date (YYYY-MM-DD).");
  try {
    const rows = await executor.select().from(nutritionTargetHistory)
      .where(lte(nutritionTargetHistory.effective_date, date))
      .orderBy(desc(nutritionTargetHistory.effective_date), desc(nutritionTargetHistory.created_at))
      .limit(1);
    const row = rows[0];
    if (row) {
      const active = await getNutritionTargets(executor);
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
    return getNutritionTargets(executor);
  }
  // Older installs may have a current profile but no history row yet.
  return getNutritionTargets(executor);
}
