export type WorkoutSessionStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface WorkoutSetInput {
  id: string;
  exercise_log_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  duration_sec?: number | null;
  distance_km?: number | null;
  rpe?: number | null;
  is_pr?: number | null;
  is_warmup?: number | null;
}

export function validateWorkoutSetInput(set: WorkoutSetInput): void {
  if (!set.id?.trim()) throw new Error("Set ID is required.");
  if (!set.exercise_log_id?.trim()) throw new Error("Exercise log ID is required.");
  if (!Number.isInteger(set.set_number) || set.set_number < 1) throw new Error("Set number must be a positive integer.");
  if (!Number.isFinite(set.weight_kg) || set.weight_kg < 0 || set.weight_kg > 2000) throw new Error("Weight must be between 0 and 2000 kg.");
  if (!Number.isInteger(set.reps) || set.reps < 1 || set.reps > 10000) throw new Error("Reps must be a positive integer.");
  if (set.duration_sec != null && (!Number.isInteger(set.duration_sec) || set.duration_sec < 1 || set.duration_sec > 86400)) {
    throw new Error("Duration must be between 1 and 86400 seconds.");
  }
  if (set.distance_km != null && (!Number.isFinite(set.distance_km) || set.distance_km < 0 || set.distance_km > 1000)) {
    throw new Error("Distance must be between 0 and 1000 km.");
  }
  if (set.rpe != null && (!Number.isInteger(set.rpe) || set.rpe < 1 || set.rpe > 10)) {
    throw new Error("RPE must be an integer from 1 to 10.");
  }
  for (const [label, value] of [["PR flag", set.is_pr], ["warm-up flag", set.is_warmup]] as const) {
    if (value != null && value !== 0 && value !== 1) throw new Error(label + " must be 0 or 1.");
  }
}

export function assertWorkoutStatusTransition(current: WorkoutSessionStatus, next: WorkoutSessionStatus): void {
  const allowed: Record<WorkoutSessionStatus, WorkoutSessionStatus[]> = {
    planned: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (current === next) return;
  if (!allowed[current].includes(next)) {
    throw new Error("Cannot change workout session from " + current + " to " + next + ".");
  }
}
