export function e1rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError("Weight must be a finite non-negative number.");
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError("Repetitions must be a positive integer.");
  }
  return reps <= 1 ? weightKg : weightKg * (1 + Math.min(reps, 12) / 30);
}
