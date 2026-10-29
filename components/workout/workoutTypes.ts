import type { SetLog } from "../../lib/data/types";
import type { ExerciseType } from "../../lib/constants/exercises";

export interface SetForm {
  exerciseLogId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
  durationSec: string;
  distanceKm: string;
  durationMin: string;
}

export function formatDuration(sec: number): string {
  if (sec >= 60) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${sec}s`;
}

export function setLabel(set: SetLog, type: ExerciseType): string {
  switch (type) {
    case "reps_only":
      return `× ${set.reps} reps`;
    case "duration":
      return formatDuration(set.duration_sec ?? set.reps ?? 0);
    case "distance_duration": {
      const distance = set.distance_km ?? 0;
      const duration =
        set.duration_sec != null ? Math.round(set.duration_sec / 60) : set.reps;
      return `${distance.toFixed(1)}km · ${duration}min`;
    }
    default:
      return `${set.weight_kg}kg × ${set.reps}`;
  }
}

export function blankForm(
  exerciseLogId: string,
  exerciseName: string,
  exerciseType: ExerciseType,
  lastWeight?: number | null,
): SetForm {
  return {
    exerciseLogId,
    exerciseName,
    exerciseType,
    weight: lastWeight?.toString() ?? "",
    reps: "",
    rpe: "",
    isWarmup: false,
    durationSec: "",
    distanceKm: "",
    durationMin: "",
  };
}

export function formFromSet(
  set: SetLog,
  exerciseLogId: string,
  exerciseName: string,
  exerciseType: ExerciseType,
): SetForm {
  return {
    exerciseLogId,
    exerciseName,
    exerciseType,
    weight: set.weight_kg.toString(),
    reps: set.reps.toString(),
    rpe: set.rpe?.toString() ?? "",
    isWarmup: !!set.is_warmup,
    durationSec: set.duration_sec?.toString() ?? "",
    distanceKm: set.distance_km?.toString() ?? "",
    durationMin:
      set.duration_sec != null ? Math.round(set.duration_sec / 60).toString() : "",
  };
}
