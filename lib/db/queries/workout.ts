// @ts-nocheck
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../client";
import {
  workoutSessions,
  exerciseLogs,
  setLogs,
  personalRecords,
  type WorkoutSession,
  type NewWorkoutSession,
  type ExerciseLog,
  type NewExerciseLog,
  type SetLog,
  type NewSetLog,
  type PersonalRecord,
  customExercises,
  type CustomExercise,
  type NewCustomExercise,
} from "../schema";

// ─── Epley 1RM Formula ────────────────────────────────────────────────────────
export function calculateEpley1RM(weight_kg: number, reps: number): number {
  if (reps === 1) return weight_kg;
  return weight_kg * (1 + reps / 30);
}

// ─── Session Queries ──────────────────────────────────────────────────────────

export async function getSessionsForDate(date: string): Promise<WorkoutSession[]> {
  return db.select().from(workoutSessions).where(eq(workoutSessions.date, date));
}

export async function getRecentSessions(limit: number = 5): Promise<WorkoutSession[]> {
  return db
    .select()
    .from(workoutSessions)
    .orderBy(desc(workoutSessions.date))
    .limit(limit);
}

export async function getSessionsInRange(
  startDate: string,
  endDate: string
): Promise<WorkoutSession[]> {
  return db
    .select()
    .from(workoutSessions)
    .where(
      and(
        gte(workoutSessions.date, startDate),
        lte(workoutSessions.date, endDate)
      )
    )
    .orderBy(desc(workoutSessions.date));
}

// Alias for consistency with other query functions
export const getSessionsForDateRange = getSessionsInRange;

export async function insertSession(session: NewWorkoutSession): Promise<void> {
  await db.insert(workoutSessions).values(session);
}

export async function updateSession(
  id: string,
  updates: Partial<NewWorkoutSession>
): Promise<void> {
  await db.update(workoutSessions).set(updates).where(eq(workoutSessions.id, id));
}

export async function getSessionById(id: string): Promise<WorkoutSession | null> {
  const result = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, id));
  return result[0] ?? null;
}

// ─── Exercise Log Queries ─────────────────────────────────────────────────────

export async function getExercisesForSession(sessionId: string): Promise<ExerciseLog[]> {
  return db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.session_id, sessionId))
    .orderBy(exerciseLogs.order_in_session);
}

export async function insertExerciseLog(log: NewExerciseLog): Promise<void> {
  await db.insert(exerciseLogs).values(log);
}

export async function updateExerciseLog(
  id: string,
  updates: Partial<NewExerciseLog>
): Promise<void> {
  await db.update(exerciseLogs).set(updates).where(eq(exerciseLogs.id, id));
}

export async function deleteExerciseLog(id: string): Promise<void> {
  // Delete sets first
  await db.delete(setLogs).where(eq(setLogs.exercise_log_id, id));
  await db.delete(exerciseLogs).where(eq(exerciseLogs.id, id));
}

// ─── Set Log Queries ──────────────────────────────────────────────────────────

export async function getSetsForExercise(exerciseLogId: string): Promise<SetLog[]> {
  return db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exercise_log_id, exerciseLogId))
    .orderBy(setLogs.set_number);
}

export async function insertSetLog(set: NewSetLog): Promise<{ isPR: boolean }> {
  // Check for PR before inserting
  const isPR = await checkAndUpdatePR(set);
  await db.insert(setLogs).values({ ...set, is_pr: isPR ? 1 : 0 });

  // Update session volume
  await updateSessionVolume(set.exercise_log_id);

  return { isPR };
}

export async function deleteSetLog(id: string, exerciseLogId: string): Promise<void> {
  await db.delete(setLogs).where(eq(setLogs.id, id));
  await updateSessionVolume(exerciseLogId);
}

export async function updateSetLog(
  id: string,
  updates: Partial<NewSetLog>,
  exerciseLogId: string
): Promise<void> {
  await db.update(setLogs).set(updates).where(eq(setLogs.id, id));
  await updateSessionVolume(exerciseLogId);
}

// ─── Volume Calculation ───────────────────────────────────────────────────────

async function updateSessionVolume(exerciseLogId: string): Promise<void> {
  const exercise = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, exerciseLogId));

  if (!exercise[0]) return;

  const sessionId = exercise[0].session_id;

  // Get all exercises in session
  const exercises = await getExercisesForSession(sessionId);
  let totalVolume = 0;

  for (const ex of exercises) {
    // Only weight_reps exercises contribute to volume
    const exType = ex.exercise_type ?? "weight_reps";
    if (exType !== "weight_reps") continue;

    const sets = await getSetsForExercise(ex.id);
    for (const set of sets) {
      if (!set.is_warmup) {
        totalVolume += set.weight_kg * set.reps;
      }
    }
  }

  await db
    .update(workoutSessions)
    .set({ total_volume_kg: totalVolume })
    .where(eq(workoutSessions.id, sessionId));
}

// ─── PR Detection ─────────────────────────────────────────────────────────────

async function checkAndUpdatePR(set: NewSetLog): Promise<boolean> {
  if (set.is_warmup) return false;

  // Get exercise name
  const exercise = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, set.exercise_log_id));

  if (!exercise[0]) return false;

  const exerciseName = exercise[0].exercise_name;
  const current1RM = calculateEpley1RM(set.weight_kg, set.reps);
  const currentVolume = set.weight_kg * set.reps;

  const existing = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.exercise_name, exerciseName));

  const today = new Date().toISOString().split("T")[0];

  if (!existing[0]) {
    // First time logging this exercise — it's a PR by default
    await db.insert(personalRecords).values({
      exercise_name: exerciseName,
      best_weight_kg: set.weight_kg,
      best_reps_at_best_weight: set.reps,
      best_1rm_estimated: current1RM,
      best_volume_single_set: currentVolume,
      achieved_date: today,
      previous_best_kg: null,
      improvement_pct: null,
    });
    return true;
  }

  const pr = existing[0];
  const isPR =
    set.weight_kg > pr.best_weight_kg ||
    (set.weight_kg === pr.best_weight_kg &&
      set.reps > (pr.best_reps_at_best_weight ?? 0));

  if (isPR) {
    const improvementPct =
      pr.best_weight_kg > 0
        ? ((set.weight_kg - pr.best_weight_kg) / pr.best_weight_kg) * 100
        : 0;

    await db
      .update(personalRecords)
      .set({
        best_weight_kg: set.weight_kg,
        best_reps_at_best_weight: set.reps,
        best_1rm_estimated: current1RM,
        best_volume_single_set: currentVolume,
        achieved_date: today,
        previous_best_kg: pr.best_weight_kg,
        improvement_pct: improvementPct,
      })
      .where(eq(personalRecords.exercise_name, exerciseName));
  }

  return isPR;
}

// ─── PR Queries ───────────────────────────────────────────────────────────────

export async function getAllPRs(): Promise<PersonalRecord[]> {
  return db.select().from(personalRecords);
}

export async function getPRForExercise(exerciseName: string): Promise<PersonalRecord | null> {
  const result = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.exercise_name, exerciseName));
  return result[0] ?? null;
}

// ─── Double Progression Check ─────────────────────────────────────────────────

export interface DoubleProgressionStatus {
  shouldProgress: boolean;
  message: string;
  lastTwoSessions: { date: string; allSetsHit12: boolean }[];
}

export async function checkDoubleProgression(
  exerciseName: string
): Promise<DoubleProgressionStatus> {
  // Get last 2 sessions where this exercise was logged
  const recentExercises = await db
    .select({
      session_id: exerciseLogs.session_id,
      date: exerciseLogs.date,
      exercise_log_id: exerciseLogs.id,
    })
    .from(exerciseLogs)
    .where(eq(exerciseLogs.exercise_name, exerciseName))
    .orderBy(desc(exerciseLogs.date))
    .limit(2);

  if (recentExercises.length < 2) {
    return {
      shouldProgress: false,
      message: "Not enough data yet",
      lastTwoSessions: [],
    };
  }

  const sessionData = await Promise.all(
    recentExercises.map(async (ex) => {
      const sets = await getSetsForExercise(ex.exercise_log_id);
      const workingSets = sets.filter((s) => !s.is_warmup);
      const allHit12 = workingSets.length >= 3 && workingSets.every((s) => s.reps >= 12);
      return { date: ex.date, allSetsHit12: allHit12 };
    })
  );

  const bothHit12 = sessionData.every((s) => s.allSetsHit12);

  return {
    shouldProgress: bothHit12,
    message: bothHit12
      ? `You hit 3×12 in the last 2 sessions — increase weight today`
      : `Keep working toward 3×12 before progressing`,
    lastTwoSessions: sessionData,
  };
}

// ─── Last Weight Used ─────────────────────────────────────────────────────────

export async function getLastWeightForExercise(
  exerciseName: string
): Promise<number | null> {
  const recent = await db
    .select({ exercise_log_id: exerciseLogs.id })
    .from(exerciseLogs)
    .where(eq(exerciseLogs.exercise_name, exerciseName))
    .orderBy(desc(exerciseLogs.date))
    .limit(1);

  if (!recent[0]) return null;

  const sets = await getSetsForExercise(recent[0].exercise_log_id);
  const workingSets = sets.filter((s) => !s.is_warmup);
  if (workingSets.length === 0) return null;

  return workingSets[workingSets.length - 1].weight_kg;
}

// ─── Previous Session Data ────────────────────────────────────────────────────

export interface PreviousSessionData {
  session: WorkoutSession;
  exercises: Array<{
    exercise: ExerciseLog;
    sets: SetLog[];
  }>;
}

export async function getPreviousSessionForDayType(
  dayType: string,
  beforeDate: string
): Promise<PreviousSessionData | null> {
  // Get the most recent session of the same day type before the given date
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.day_type, dayType),
        sql`${workoutSessions.date} < ${beforeDate}`
      )
    )
    .orderBy(desc(workoutSessions.date))
    .limit(1);

  if (!sessions[0]) return null;

  const session = sessions[0];
  const exercises = await getExercisesForSession(session.id);

  const exercisesWithSets = await Promise.all(
    exercises.map(async (exercise) => {
      const sets = await getSetsForExercise(exercise.id);
      return { exercise, sets };
    })
  );

  return {
    session,
    exercises: exercisesWithSets,
  };
}

// ─── Custom Exercise Queries ──────────────────────────────────────────────────

export async function getCustomExercises(): Promise<CustomExercise[]> {
  return db.select().from(customExercises).orderBy(desc(customExercises.created_at));
}

export async function insertCustomExercise(exercise: NewCustomExercise): Promise<void> {
  await db.insert(customExercises).values(exercise).onConflictDoNothing();
}
