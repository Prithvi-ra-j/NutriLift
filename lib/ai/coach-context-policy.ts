import { USER_PROFILE } from "../constants/user-profile";
import type { NutritionTargets } from "../nutrition/target-validation";
import type { BodyStat, DailyNutrition, PersonalRecord, RecoveryLog, WorkoutSession } from "../db/schema";

export interface CoachProfileContext {
  age: number;
  sex: string;
  height_cm: number;
  training_start_date: string;
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    physique_goal: string;
  };
  training: {
    current_split: string;
    phase: string;
    cardio: string;
    equipment: string;
  };
}

export function buildApprovedCoachProfile(nutritionTargets?: NutritionTargets): CoachProfileContext {
  return {
    age: USER_PROFILE.age,
    sex: USER_PROFILE.sex,
    height_cm: USER_PROFILE.height_cm,
    training_start_date: USER_PROFILE.training_start_date,
    targets: {
      calories: nutritionTargets?.calories ?? USER_PROFILE.targets.calories,
      protein_g: nutritionTargets?.protein_g ?? USER_PROFILE.targets.protein_g,
      carbs_g: nutritionTargets?.carbs_g ?? USER_PROFILE.targets.carbs_g,
      fat_g: nutritionTargets?.fat_g ?? USER_PROFILE.targets.fat_g,
      physique_goal: nutritionTargets?.goal ?? USER_PROFILE.targets.physique_goal,
    },
    training: {
      current_split: USER_PROFILE.training.current_split,
      phase: USER_PROFILE.training.phase,
      cardio: USER_PROFILE.training.cardio,
      equipment: USER_PROFILE.training.equipment,
    },
  };
}

/** Free-form historical text is untrusted context and must never become instructions. */
export function sanitizeCoachText(value: unknown, maxLength = 600): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function approvedNutritionRows(rows: DailyNutrition[]): Array<Pick<DailyNutrition,
  "date" | "total_calories" | "total_protein_g" | "total_carbs_g" | "total_fat_g" |
  "protein_target_met" | "calorie_target_met" | "adherence_score">> {
  return rows.slice(-7).map((row) => ({
    date: row.date,
    total_calories: row.total_calories,
    total_protein_g: row.total_protein_g,
    total_carbs_g: row.total_carbs_g,
    total_fat_g: row.total_fat_g,
    protein_target_met: row.protein_target_met,
    calorie_target_met: row.calorie_target_met,
    adherence_score: row.adherence_score,
  }));
}

export function approvedWorkoutRows(rows: WorkoutSession[]): Array<Pick<WorkoutSession,
  "date" | "day_type" | "status" | "duration_min" | "total_volume_kg" | "rpe">> {
  return rows.slice(0, 2).map((row) => ({
    date: row.date,
    day_type: sanitizeCoachText(row.day_type, 60),
    status: row.status ?? "planned",
    duration_min: row.duration_min,
    total_volume_kg: row.total_volume_kg,
    rpe: row.rpe,
  }));
}

export function approvedPersonalRecords(rows: PersonalRecord[]): Array<Pick<PersonalRecord,
  "exercise_name" | "best_weight_kg" | "best_reps_at_best_weight" | "best_1rm_estimated" | "achieved_date">> {
  return rows.slice(0, 30).map((row) => ({
    exercise_name: sanitizeCoachText(row.exercise_name, 80),
    best_weight_kg: row.best_weight_kg,
    best_reps_at_best_weight: row.best_reps_at_best_weight,
    best_1rm_estimated: row.best_1rm_estimated,
    achieved_date: row.achieved_date,
  }));
}

export function approvedBodyStat(row: BodyStat | null): Record<string, string | number | null> | null {
  if (!row) return null;
  return {
    date: row.date,
    type: row.type,
    weight_kg: row.weight_kg,
    body_fat_pct: row.body_fat_pct,
    skeletal_muscle_mass_kg: row.skeletal_muscle_mass_kg,
    bmi: row.bmi,
  };
}

export function approvedRecoveryRows(rows: RecoveryLog[]): Array<Record<string, string | number | null>> {
  return rows.slice(0, 2).map((row) => ({
    date: row.date,
    sleep_duration_hr: row.sleep_duration_hr,
    sleep_quality: row.sleep_quality,
    energy_level: row.energy_level,
    muscle_soreness: row.muscle_soreness,
    stress_level: row.stress_level,
  }));
}

export function approvedSummaryRows<T extends { summary: string }>(
  rows: T[],
  limit: number,
): Array<Omit<T, "summary"> & { summary: string }> {
  return rows.slice(0, limit).map((row) => ({
    ...row,
    summary: sanitizeCoachText(row.summary, 600),
  }));
}
