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
import { toLocalDateKey } from "../../utils/local-date";
import { appendDomainEvent } from "./domain-events";
import { enqueueWorkoutSession } from "./sync-outbox";
import { assertWorkoutStatusTransition, validateWorkoutSetInput, type WorkoutSessionStatus } from "../../workout/workout-validation";

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
  const status = session.status ?? "planned";
  if (status !== "planned" && status !== "in_progress") throw new Error("A new workout session must be planned or in progress.");
  await db.transaction(async (tx: any) => {
    const now = new Date().toISOString();
    await tx.insert(workoutSessions).values({ ...session, status, updated_at: now });
    await touchAndEnqueueSession(tx, session.id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-session:${session.id}:created`, eventType: status === "in_progress" ? "workout.session.started" : "workout.session.updated", entityType: "workout_session", entityId: session.id, entityVersion: eventVersion, occurredAt: now, metadata: { date: session.date, status } });
  });
}

export async function setSessionStatus(id: string, status: WorkoutSessionStatus): Promise<void> {
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
    const session = rows[0] as WorkoutSession | undefined;
    if (!session) throw new Error("Workout session not found.");
    const current = (session.status ?? "planned") as WorkoutSessionStatus;
    assertWorkoutStatusTransition(current, status);
    if (current === status) return;

    const now = Math.floor(Date.now() / 1000);
    const updates: Partial<NewWorkoutSession> = { status, updated_at: new Date().toISOString() };
    if (status === "in_progress" && session.started_at == null) updates.started_at = now;
    if (status === "completed" || status === "cancelled") {
      updates.ended_at = now;
      updates.duration_min = session.started_at == null ? 0 : Math.max(0, Math.round((now - session.started_at) / 60));
    }
    await tx.update(workoutSessions).set(updates).where(eq(workoutSessions.id, id));
    await touchAndEnqueueSession(tx, id);
    const eventVersion = Date.now();
    const eventType = status === "completed" ? "workout.session.completed" : status === "cancelled" ? "workout.session.cancelled" : status === "in_progress" ? "workout.session.started" : "workout.session.updated";
    await appendDomainEvent(tx, { id: `workout-session:${id}:${status}:${eventVersion}`, eventType, entityType: "workout_session", entityId: id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: session.date, status } });
  });
}

export async function updateSession(
  id: string,
  updates: Partial<NewWorkoutSession>
): Promise<void> {
  const { id: _ignoredId, status: _ignoredStatus, ...mutableUpdates } = updates;
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
    const session = rows[0] as WorkoutSession | undefined;
    if (!session) throw new Error("Workout session not found.");
    const status = (session.status ?? "planned") as WorkoutSessionStatus;
    if (status === "completed" || status === "cancelled") {
      throw new Error("This workout is " + status + " and can no longer be edited.");
    }
    const updatedAt = new Date().toISOString();
    await tx.update(workoutSessions).set({ ...mutableUpdates, updated_at: updatedAt }).where(eq(workoutSessions.id, id));
    await touchAndEnqueueSession(tx, id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-session:${id}:updated:${eventVersion}`, eventType: "workout.session.updated", entityType: "workout_session", entityId: id, entityVersion: eventVersion, occurredAt: updatedAt, metadata: { date: session.date } });
  });
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

async function assertSessionWritableInTransaction(tx: any, sessionId: string): Promise<WorkoutSession> {
  const rows = await tx.select().from(workoutSessions).where(eq(workoutSessions.id, sessionId)).limit(1);
  const session = rows[0] as WorkoutSession | undefined;
  if (!session) throw new Error("Workout session not found.");
  const status = session.status ?? "planned";
  if (status === "completed" || status === "cancelled") {
    throw new Error("This workout is " + status + " and can no longer be edited.");
  }
  return session;
}

export async function insertExerciseLog(log: NewExerciseLog): Promise<void> {
  await db.transaction(async (tx: any) => {
    await assertSessionWritableInTransaction(tx, log.session_id);
    await tx.insert(exerciseLogs).values(log);
    await touchAndEnqueueSession(tx, log.session_id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-session:${log.session_id}:exercise-added:${log.id}`, eventType: "workout.session.updated", entityType: "workout_session", entityId: log.session_id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: log.date } });
  });
}

export async function updateExerciseLog(
  id: string,
  updates: Partial<NewExerciseLog>
): Promise<void> {
  const { id: _ignoredId, session_id: _ignoredSession, date: _ignoredDate, ...mutableUpdates } = updates;
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.id, id)).limit(1);
    const existing = rows[0] as ExerciseLog | undefined;
    if (!existing) throw new Error("Exercise log not found.");
    await assertSessionWritableInTransaction(tx, existing.session_id);
    await tx.update(exerciseLogs).set(mutableUpdates).where(eq(exerciseLogs.id, id));
    if (mutableUpdates.exercise_name && mutableUpdates.exercise_name !== existing.exercise_name) {
      await recomputePersonalRecord(tx, existing.exercise_name);
      await recomputePersonalRecord(tx, mutableUpdates.exercise_name);
    }
    if (mutableUpdates.exercise_type) {
      await updateSessionVolumeForSession(tx, existing.session_id);
    }
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-session:${existing.session_id}:exercise-updated:${id}:${eventVersion}`, eventType: "workout.session.updated", entityType: "workout_session", entityId: existing.session_id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: existing.date } });
  });
}

export async function deleteExerciseLog(id: string): Promise<void> {
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.id, id)).limit(1);
    const existing = rows[0] as ExerciseLog | undefined;
    if (!existing) return;
    await assertSessionWritableInTransaction(tx, existing.session_id);
    await tx.delete(setLogs).where(eq(setLogs.exercise_log_id, id));
    await tx.delete(exerciseLogs).where(eq(exerciseLogs.id, id));
    await touchAndEnqueueSession(tx, existing.session_id);
    await recomputePersonalRecord(tx, existing.exercise_name);
    await updateSessionVolumeForSession(tx, existing.session_id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-session:${existing.session_id}:exercise-deleted:${id}:${eventVersion}`, eventType: "workout.session.updated", entityType: "workout_session", entityId: existing.session_id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: existing.date } });
  });
}

// ─── Set Log Queries ──────────────────────────────────────────────────────────

export async function getSetsForExercise(exerciseLogId: string): Promise<SetLog[]> {
  return db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exercise_log_id, exerciseLogId))
    .orderBy(setLogs.set_number);
}

export async function insertSetLog(set: NewSetLog): Promise<{ isPR: boolean; duplicate?: boolean }> {
  validateWorkoutSetInput(set);
  return db.transaction(async (tx: any) => {
    const exerciseRows = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.id, set.exercise_log_id)).limit(1);
    const exercise = exerciseRows[0] as ExerciseLog | undefined;
    if (!exercise) throw new Error("Exercise log not found.");
    await assertSessionWritableInTransaction(tx, exercise.session_id);
    const existing = await tx.select().from(setLogs).where(eq(setLogs.id, set.id)).limit(1);
    if (existing[0]) {
      if (existing[0].exercise_log_id !== set.exercise_log_id) {
        throw new Error("Set ID already belongs to a different exercise.");
      }
      return { isPR: Boolean(existing[0].is_pr), duplicate: true };
    }
    const isPR = await checkAndUpdatePR(set, tx);
    await tx.insert(setLogs).values({ ...set, is_pr: isPR ? 1 : 0 });
    await updateSessionVolumeForSession(tx, exercise.session_id);
    await touchAndEnqueueSession(tx, exercise.session_id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-set:${set.id}:recorded`, eventType: "workout.set.recorded", entityType: "workout_set", entityId: set.id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: exercise.date, sessionId: exercise.session_id } });
    return { isPR };
  });
}

export async function deleteSetLog(id: string, exerciseLogId: string): Promise<void> {
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(setLogs).where(eq(setLogs.id, id)).limit(1);
    const set = rows[0] as SetLog | undefined;
    if (!set) return;
    if (set.exercise_log_id !== exerciseLogId) throw new Error("Set does not belong to this exercise.");
    const exerciseRows = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.id, exerciseLogId)).limit(1);
    const exercise = exerciseRows[0] as ExerciseLog | undefined;
    if (!exercise) throw new Error("Exercise log not found.");
    await assertSessionWritableInTransaction(tx, exercise.session_id);
    await tx.delete(setLogs).where(eq(setLogs.id, id));
    await recomputePersonalRecord(tx, exercise.exercise_name);
    await updateSessionVolumeForSession(tx, exercise.session_id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-set:${id}:deleted:${eventVersion}`, eventType: "workout.set.deleted", entityType: "workout_set", entityId: id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: exercise.date, sessionId: exercise.session_id } });
  });
}

export async function updateSetLog(
  id: string,
  updates: Partial<NewSetLog>,
  exerciseLogId: string
): Promise<void> {
  const { id: _ignoredId, exercise_log_id: _ignoredExerciseId, ...mutableUpdates } = updates;
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(setLogs).where(eq(setLogs.id, id)).limit(1);
    const existing = rows[0] as SetLog | undefined;
    if (!existing) throw new Error("Set log not found.");
    if (existing.exercise_log_id !== exerciseLogId) throw new Error("Set does not belong to this exercise.");
    const exerciseRows = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.id, exerciseLogId)).limit(1);
    const exercise = exerciseRows[0] as ExerciseLog | undefined;
    if (!exercise) throw new Error("Exercise log not found.");
    await assertSessionWritableInTransaction(tx, exercise.session_id);
    const next = { ...existing, ...mutableUpdates } as SetLog;
    validateWorkoutSetInput(next as NewSetLog);
    await tx.update(setLogs).set(mutableUpdates).where(eq(setLogs.id, id));
    await recomputePersonalRecord(tx, exercise.exercise_name);
    await updateSessionVolumeForSession(tx, exercise.session_id);
    const eventVersion = Date.now();
    await appendDomainEvent(tx, { id: `workout-set:${id}:updated:${eventVersion}`, eventType: "workout.set.updated", entityType: "workout_set", entityId: id, entityVersion: eventVersion, occurredAt: new Date(eventVersion).toISOString(), metadata: { date: exercise.date, sessionId: exercise.session_id } });
  });
}

// ─── Volume Calculation ───────────────────────────────────────────────────────

async function updateSessionVolumeForSession(tx: any, sessionId: string): Promise<void> {
  const exercises = await tx.select().from(exerciseLogs).where(eq(exerciseLogs.session_id, sessionId));
  let totalVolume = 0;
  for (const exercise of exercises as ExerciseLog[]) {
    if ((exercise.exercise_type ?? "weight_reps") !== "weight_reps") continue;
    const sets = await tx.select().from(setLogs).where(eq(setLogs.exercise_log_id, exercise.id));
    for (const set of sets as SetLog[]) {
      if (!set.is_warmup) totalVolume += set.weight_kg * set.reps;
    }
  }
  await tx.update(workoutSessions)
    .set({ total_volume_kg: totalVolume, updated_at: new Date().toISOString() })
    .where(eq(workoutSessions.id, sessionId));
}

async function touchAndEnqueueSession(tx: any, sessionId: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  await tx.update(workoutSessions).set({ updated_at: updatedAt }).where(eq(workoutSessions.id, sessionId));
  const rows = await tx.select().from(workoutSessions).where(eq(workoutSessions.id, sessionId)).limit(1);
  if (rows[0]) await enqueueWorkoutSession(tx, rows[0] as WorkoutSession);
}

async function checkAndUpdatePR(set: NewSetLog, executor: any = db): Promise<boolean> {
  if (set.is_warmup) return false;
  const exerciseRows = await executor.select().from(exerciseLogs)
    .where(eq(exerciseLogs.id, set.exercise_log_id)).limit(1);
  const exercise = exerciseRows[0] as ExerciseLog | undefined;
  if (!exercise) return false;

  const current1RM = calculateEpley1RM(set.weight_kg, set.reps);
  const currentVolume = set.weight_kg * set.reps;
  const existing = await executor.select().from(personalRecords)
    .where(eq(personalRecords.exercise_name, exercise.exercise_name)).limit(1);
  const isPR = !existing[0] ||
    set.weight_kg > existing[0].best_weight_kg ||
    (set.weight_kg === existing[0].best_weight_kg && set.reps > (existing[0].best_reps_at_best_weight ?? 0));
  if (!isPR) return false;

  const previous = existing[0] as PersonalRecord | undefined;
  const record = {
    exercise_name: exercise.exercise_name,
    best_weight_kg: set.weight_kg,
    best_reps_at_best_weight: set.reps,
    best_1rm_estimated: current1RM,
    best_volume_single_set: currentVolume,
    achieved_date: exercise.date,
    previous_best_kg: previous?.best_weight_kg ?? null,
    improvement_pct: previous && previous.best_weight_kg > 0
      ? ((set.weight_kg - previous.best_weight_kg) / previous.best_weight_kg) * 100
      : null,
    updated_at: new Date().toISOString(),
  };
  if (previous) {
    await executor.update(personalRecords).set(record)
      .where(eq(personalRecords.exercise_name, exercise.exercise_name));
  } else {
    await executor.insert(personalRecords).values(record);
  }
  return true;
}

/** Rebuild the current best from surviving sets after a correction or deletion. */
async function recomputePersonalRecord(tx: any, exerciseName: string): Promise<void> {
  const exerciseRows = await tx.select().from(exerciseLogs)
    .where(eq(exerciseLogs.exercise_name, exerciseName));
  const candidates: Array<{ exercise: ExerciseLog; set: SetLog }> = [];
  for (const exercise of exerciseRows as ExerciseLog[]) {
    const sets = await tx.select().from(setLogs).where(eq(setLogs.exercise_log_id, exercise.id));
    for (const set of sets as SetLog[]) {
      if (!set.is_warmup) candidates.push({ exercise, set });
    }
  }
  const oldRows = await tx.select().from(personalRecords)
    .where(eq(personalRecords.exercise_name, exerciseName)).limit(1);
  const old = oldRows[0] as PersonalRecord | undefined;
  if (candidates.length === 0) {
    if (old) await tx.delete(personalRecords).where(eq(personalRecords.exercise_name, exerciseName));
    return;
  }
  candidates.sort((a, b) =>
    b.set.weight_kg - a.set.weight_kg ||
    b.set.reps - a.set.reps ||
    a.exercise.date.localeCompare(b.exercise.date),
  );
  const best = candidates[0];
  const record = {
    exercise_name: exerciseName,
    best_weight_kg: best.set.weight_kg,
    best_reps_at_best_weight: best.set.reps,
    best_1rm_estimated: calculateEpley1RM(best.set.weight_kg, best.set.reps),
    best_volume_single_set: best.set.weight_kg * best.set.reps,
    achieved_date: best.exercise.date,
    previous_best_kg: old?.best_weight_kg ?? null,
    improvement_pct: null,
    updated_at: new Date().toISOString(),
  };
  if (old) await tx.update(personalRecords).set(record).where(eq(personalRecords.exercise_name, exerciseName));
  else await tx.insert(personalRecords).values(record);
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
    recentExercises.map(async (ex: { exercise_log_id: string; date: string }) => {
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
