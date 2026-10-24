export type VolumeSet = {
  weightKg: number;
  reps: number;
  isWarmup: boolean;
  exerciseType: string | null;
};

export function calculateVolume(sets: VolumeSet[]): number {
  return sets.reduce((total, set) => {
    const type = set.exerciseType ?? "weight_reps";
    if (
      set.isWarmup ||
      (type !== "weight_reps" && type !== "bodyweight_reps") ||
      !Number.isFinite(set.weightKg) ||
      !Number.isFinite(set.reps)
    ) {
      return total;
    }
    return total + set.weightKg * set.reps;
  }, 0);
}
