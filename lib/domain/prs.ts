import { e1rm } from "./e1rm";

export type SetPoint = {
  setId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  date: string;
  loggedAt: number;
  isWarmup: boolean;
};

export type ExerciseBest = {
  setId: string;
  weightKg: number;
  reps: number;
  e1rmKg: number;
  date: string;
  loggedAt: number;
};

export type PRDerivation = {
  prSetIds: Set<string>;
  bestByExercise: Map<string, ExerciseBest>;
};

export function derivePRs(sets: SetPoint[]): PRDerivation {
  const ordered = [...sets].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.loggedAt - right.loggedAt ||
      left.setId.localeCompare(right.setId),
  );
  const prSetIds = new Set<string>();
  const bestByExercise = new Map<string, ExerciseBest>();

  for (const set of ordered) {
    if (set.isWarmup || !Number.isInteger(set.reps) || set.reps < 1) continue;
    if (!Number.isFinite(set.weightKg) || set.weightKg < 0) continue;

    const estimated = e1rm(set.weightKg, set.reps);
    const best = bestByExercise.get(set.exerciseName);
    if (!best || estimated > best.e1rmKg) {
      prSetIds.add(set.setId);
      bestByExercise.set(set.exerciseName, {
        setId: set.setId,
        weightKg: set.weightKg,
        reps: set.reps,
        e1rmKg: estimated,
        date: set.date,
        loggedAt: set.loggedAt,
      });
    }
  }

  return { prSetIds, bestByExercise };
}
