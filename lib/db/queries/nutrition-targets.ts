import { desc, eq, lte } from "drizzle-orm";
import uuid from "react-native-uuid";
import { USER_PROFILE } from "../../constants/user-profile";
import { toLocalDateKey } from "../../utils/local-date";
import { db } from "../client";
import { nutritionProfile, nutritionTargetHistory } from "../schema";

export type NutritionGoal = "lose" | "maintain" | "gain";
export type NutritionTargetMode = "manual" | "adaptive";

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: NutritionGoal;
  mode: NutritionTargetMode;
}

export interface NutritionTargetSaveOptions {
  source?: NutritionTargetMode;
  effectiveDate?: string;
  maintenanceEstimateKcal?: number | null;
  algorithmVersion?: number | null;
  explanation?: string | null;
}

export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: USER_PROFILE.targets.calories,
  protein_g: USER_PROFILE.targets.protein_g,
  carbs_g: USER_PROFILE.targets.carbs_g,
  fat_g: USER_PROFILE.targets.fat_g,
  goal: "lose",
  mode: "manual",
};

export function validateNutritionTargets(targets: NutritionTargets): void {
  if (!Number.isInteger(targets.calories) || targets.calories < 1200 || targets.calories > 6000) {
    throw new Error("Calories must be a whole number between 1200 and 6000 kcal.");
  }
  if (!Number.isFinite(targets.protein_g) || targets.protein_g < 20 || targets.protein_g > 400) {
    throw new Error("Protein must be between 20 and 400 g.");
  }
  if (!Number.isFinite(targets.carbs_g) || targets.carbs_g < 0 || targets.carbs_g > 800) {
    throw new Error("Carbohydrates must be between 0 and 800 g.");
  }
  if (!Number.isFinite(targets.fat_g) || targets.fat_g < 0 || targets.fat_g > 300) {
    throw new Error("Fat must be between 0 and 300 g.");
  }
  if (!["lose", "maintain", "gain"].includes(targets.goal)) {
    throw new Error("Choose a supported goal: lose, maintain, or gain.");
  }
  if (!["manual", "adaptive"].includes(targets.mode)) {
    throw new Error("Choose manual or adaptive target mode.");
  }
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
  } catch (error) {
    // Web uses a no-op DB. On native, malformed persisted values should not leak
    // into calculations; return the safe defaults and keep the screen usable.
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

  const now = new Date().toISOString();
  const source = options.source ?? targets.mode;
  // Update active settings and append history together, so history never records
  // a target change that failed to become the active target.
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
        goal: active.goal,
        mode: row.source === "adaptive" ? "adaptive" : "manual",
      };
    }
  } catch {
    // If local persistence is unavailable (e.g. web), current defaults still work.
  }
  return getNutritionTargets();
}
