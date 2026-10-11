import { and, desc, eq, lte } from "drizzle-orm";
import { USER_PROFILE } from "../../constants/user-profile";
import { db } from "../client";
import { nutritionProfile, nutritionTargetHistory, nutritionDayStatus } from "../schema";
import type { NutritionGoal } from "../../nutrition/adaptive-targets";
import { toLocalDateKey } from "../../utils/local-date";
import uuid from "react-native-uuid";

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: NutritionGoal;
  mode: "manual" | "adaptive";
}

const DEFAULT_TARGETS: NutritionTargets = {
  calories: USER_PROFILE.targets.calories,
  protein_g: USER_PROFILE.targets.protein_g,
  carbs_g: USER_PROFILE.targets.carbs_g,
  fat_g: USER_PROFILE.targets.fat_g,
  goal: "lose",
  mode: "manual",
};

function validTargets(targets: NutritionTargets): boolean {
  return Number.isInteger(targets.calories) && targets.calories >= 1200 && targets.calories <= 6000
    && Number.isFinite(targets.protein_g) && targets.protein_g >= 20 && targets.protein_g <= 400
    && Number.isFinite(targets.carbs_g) && targets.carbs_g >= 0 && targets.carbs_g <= 800
    && Number.isFinite(targets.fat_g) && targets.fat_g >= 0 && targets.fat_g <= 300
    && ["lose", "maintain", "gain"].includes(targets.goal)
    && ["manual", "adaptive"].includes(targets.mode);
}

export async function getNutritionTargets(): Promise<NutritionTargets> {
  try {
    const rows = await db.select().from(nutritionProfile).where(eq(nutritionProfile.id, 1)).limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_TARGETS;
    return {
      calories: row.calorie_target_kcal,
      protein_g: row.protein_target_g,
      carbs_g: row.carbs_target_g,
      fat_g: row.fat_target_g,
      goal: row.goal as NutritionGoal,
      mode: row.target_mode as "manual" | "adaptive",
    };
  } catch {
    // Web uses a no-op DB; defaults remain available until native SQLite is used.
    return DEFAULT_TARGETS;
  }
}

export async function saveNutritionTargets(
  targets: NutritionTargets,
  options: { source?: "manual" | "adaptive"; effectiveDate?: string; maintenanceEstimateKcal?: number | null; algorithmVersion?: number | null; explanation?: string | null } = {}
): Promise<void> {
  if (!validTargets(targets)) throw new Error("Nutrition targets are outside supported ranges.");
  const now = new Date().toISOString();
  const effectiveDate = options.effectiveDate ?? toLocalDateKey();
  const source = options.source ?? "manual";
  await db.insert(nutritionProfile).values({
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

  await db.insert(nutritionTargetHistory).values({
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
}

export async function getNutritionTargetsForDate(date: string): Promise<NutritionTargets> {
  try {
    const rows = await db.select().from(nutritionTargetHistory)
      .where(lte(nutritionTargetHistory.effective_date, date))
      .orderBy(desc(nutritionTargetHistory.effective_date))
      .limit(1);
    const row = rows[0];
    if (row) {
      const goalTargets = await getNutritionTargets();
      return {
        calories: row.calorie_target_kcal,
        protein_g: row.protein_target_g,
        carbs_g: row.carbs_target_g,
        fat_g: row.fat_target_g,
        goal: goalTargets.goal,
        mode: row.source === "adaptive" ? "adaptive" : "manual",
      };
    }
  } catch {
    // Fall through to active target on web/no-op DB.
  }
  return getNutritionTargets();
}

export async function setNutritionDayComplete(date: string, complete: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(nutritionDayStatus).values({
    date,
    is_complete: complete ? 1 : 0,
    confirmed_at: complete ? now : null,
    updated_at: now,
  }).onConflictDoUpdate({
    target: nutritionDayStatus.date,
    set: { is_complete: complete ? 1 : 0, confirmed_at: complete ? now : null, updated_at: now },
  });
}

export async function isNutritionDayComplete(date: string): Promise<boolean> {
  try {
    const rows = await db.select().from(nutritionDayStatus).where(and(eq(nutritionDayStatus.date, date), eq(nutritionDayStatus.is_complete, 1))).limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
