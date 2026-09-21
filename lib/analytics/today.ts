import type { DailyNutrition, FoodLog, RecoveryLog, WorkoutSession } from "../db/schema";

export function getMealCount(logs: FoodLog[]): number {
  return new Set(logs.map(log => log.meal)).size;
}

export function getProteinRemaining(protein: number, target: number): number {
  return Math.max(0, target - protein);
}

export function getRecoveryScore(log: RecoveryLog | null): number | null {
  if (!log) return null;
  const raw = ((log.sleep_quality ?? 3) + (log.energy_level ?? 3) + (6 - (log.muscle_soreness ?? 3))) / 3;
  return Math.round((raw / 5) * 100);
}

export function getWorkoutStatus(session: WorkoutSession | null): "not_started" | "completed" {
  return session ? "completed" : "not_started";
}
