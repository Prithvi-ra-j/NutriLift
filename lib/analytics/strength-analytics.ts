import { calculateEpley1RM } from "../db/queries/workout";
import type { WorkoutSession, ExerciseLog, SetLog, PersonalRecord } from "../db/schema";

export interface StrengthSummary {
  totalSessions: number;
  totalSets: number;
  totalVolumeKg: number;
  avgSessionVolumeKg: number;
  prsSet: PersonalRecord[];
  muscleGroupDistribution: Record<string, number>;
}

export interface ExerciseProgressPoint {
  date: string;
  topSetWeight: number;
  estimated1RM: number;
  totalVolume: number;
}

export function computeStrengthSummary(
  sessions: WorkoutSession[],
  prs: PersonalRecord[]
): StrengthSummary {
  const totalSessions = sessions.length;
  const totalVolumeKg = sessions.reduce((acc, s) => acc + (s.total_volume_kg ?? 0), 0);
  const avgSessionVolumeKg = totalSessions > 0 ? totalVolumeKg / totalSessions : 0;

  return {
    totalSessions,
    totalSets: 0, // computed separately
    totalVolumeKg,
    avgSessionVolumeKg,
    prsSet: prs,
    muscleGroupDistribution: {},
  };
}

// Strength standards for natural athletes (approximate, in kg for 75kg male)
export const STRENGTH_STANDARDS: Record<
  string,
  { beginner: number; intermediate: number; advanced: number }
> = {
  "Flat Barbell Bench Press": { beginner: 60, intermediate: 90, advanced: 120 },
  "Barbell Row": { beginner: 60, intermediate: 90, advanced: 120 },
  "Squat": { beginner: 80, intermediate: 110, advanced: 150 },
  "Deadlift": { beginner: 100, intermediate: 140, advanced: 180 },
  "Lat Pulldown": { beginner: 50, intermediate: 75, advanced: 100 },
  "Shoulder Press Machine": { beginner: 40, intermediate: 60, advanced: 80 },
  "Leg Press": { beginner: 120, intermediate: 180, advanced: 240 },
};

export function getStrengthLevel(
  exerciseName: string,
  estimated1RM: number
): "beginner" | "intermediate" | "advanced" | "elite" | "unknown" {
  const standards = STRENGTH_STANDARDS[exerciseName];
  if (!standards) return "unknown";

  if (estimated1RM < standards.beginner) return "beginner";
  if (estimated1RM < standards.intermediate) return "intermediate";
  if (estimated1RM < standards.advanced) return "advanced";
  return "elite";
}
