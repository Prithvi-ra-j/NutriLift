import { eq, and, gte, lte, desc, sql, isNull, inArray, or } from "drizzle-orm";
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
import { inTx } from "../tx";
import { nowIso } from "../../time/clock";
import {
  addDays,
  localDateString,
  startOfWeekMonday,
} from "../../time/localDate";
import {
  clearTombstoneInTransaction,
} from "../../integrations/life-os/syncRepository";
import { buildPersonalRecordExternalId } from "../../integrations/life-os/recordMappers";
import { derivePRs, e1rm, shouldIncreaseLoad, type SetPoint } from "../../domain";
import { getTemplateForDayType, WORKOUT_TEMPLATES } from "../../constants/workout-templates";
import { EXERCISE_LIBRARY } from "../../constants/exercises";
import uuid from "react-native-uuid";

// ─── Epley 1RM Formula ────────────────────────────────────────────────────────
export function calculateEpley1RM(weight_kg: number, reps: number): number {
  return e1rm(weight_kg, reps);
}

// ─── Session Queries ──────────────────────────────────────────────────────────

export async function getSessionsForDate(date: string): Promise<WorkoutSession[]> {
  return db.select().from(workoutSessions).where(and(
    eq(workoutSessions.date, date),
    isNull(workoutSessions.deleted_at),
  ));
}

export async function getRecentSessions(limit: number = 5): Promise<WorkoutSession[]> {
  return db
    .select()
    .from(workoutSessions)
    .where(isNull(workoutSessions.deleted_at))
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
        isNull(workoutSessions.deleted_at),
        gte(workoutSessions.date, startDate),
        lte(workoutSessions.date, endDate)
      )
    )
    .orderBy(desc(workoutSessions.date));
}

// Alias for consistency with other query functions
export const getSessionsForDateRange = getSessionsInRange;

export async function insertSession(session: NewWorkoutSession): Promise<void> {
  await inTx(async () => {
    await db.insert(workoutSessions).values({
      ...session,
      updated_at: nowIso(),
      deleted_at: null,
    });
  });
}

export async function updateSession(
  id: string,
  updates: Partial<NewWorkoutSession>
): Promise<void> {
  await inTx(async () => {
    await db
      .update(workoutSessions)
      .set({ ...updates, updated_at: nowIso() })
      .where(and(
        eq(workoutSessions.id, id),
        isNull(workoutSessions.deleted_at),
      ));
  });
}

export async function getSessionById(id: string): Promise<WorkoutSession | null> {
  const result = await db
    .select()
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.id, id),
      isNull(workoutSessions.deleted_at),
    ));
  return result[0] ?? null;
}

// ─── Exercise Log Queries ─────────────────────────────────────────────────────

export async function getExercisesForSession(sessionId: string): Promise<ExerciseLog[]> {
  return db
    .select()
    .from(exerciseLogs)
    .where(and(
      eq(exerciseLogs.session_id, sessionId),
      isNull(exerciseLogs.deleted_at),
    ))
    .orderBy(exerciseLogs.order_in_session);
}

export async function insertExerciseLog(log: NewExerciseLog): Promise<void> {
  await inTx(async () => {
    await db.insert(exerciseLogs).values({
      ...log,
      updated_at: nowIso(),
      deleted_at: null,
    });
  });
}

export async function addTemplateExercises(
  sessionId: string,
  names: string[],
): Promise<void> {
  if (names.length === 0) return;
  return inTx(async () => {
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length !== names.length) {
      throw new Error("A template cannot add the same exercise more than once.");
    }
    const selected = uniqueNames.map((name) => {
      const template = Object.values(WORKOUT_TEMPLATES)
        .flat()
        .find((entry) => entry.name === name);
      if (!template) throw new Error(`Unknown workout template exercise: ${name}`);
      const libraryEntry = EXERCISE_LIBRARY.find((entry) => entry.name === name);
      return { template, exerciseType: libraryEntry?.exercise_type ?? "weight_reps" };
    });
    const [session] = await db
      .select({ id: workoutSessions.id, date: workoutSessions.date })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), isNull(workoutSessions.deleted_at)));
    if (!session) throw new Error(`Workout session ${sessionId} was not found.`);

    const [result] = await db
      .select({ base: sql<number>`COALESCE(MAX(${exerciseLogs.order_in_session}), 0)` })
      .from(exerciseLogs)
      .where(and(
        eq(exerciseLogs.session_id, sessionId),
        isNull(exerciseLogs.deleted_at),
      ));
    const timestamp = nowIso();
    const exercises: NewExerciseLog[] = selected.map(({ template, exerciseType }, index) => ({
      id: uuid.v4() as string,
      session_id: sessionId,
      date: session.date,
      exercise_name: template.name,
      muscle_group: template.muscle_group,
      equipment: template.equipment,
      exercise_type: exerciseType,
      order_in_session: (result?.base ?? 0) + index + 1,
      updated_at: timestamp,
      deleted_at: null,
    }));
    await db.insert(exerciseLogs).values(exercises);
  });
}

export async function updateExerciseLog(
  id: string,
  updates: Partial<NewExerciseLog>
): Promise<void> {
  await inTx(async () => {
    const [existing] = await db
      .select({ name: exerciseLogs.exercise_name, sessionId: exerciseLogs.session_id })
      .from(exerciseLogs)
      .where(eq(exerciseLogs.id, id));
    if (!existing) return;
    await db
      .update(exerciseLogs)
      .set({ ...updates, updated_at: nowIso() })
      .where(and(
        eq(exerciseLogs.id, id),
        isNull(exerciseLogs.deleted_at),
      ));
    await recomputePRsForExercise(existing.name);
    if (updates.exercise_name && updates.exercise_name !== existing.name) {
      await recomputePRsForExercise(updates.exercise_name);
    }
    await updateSessionVolume(existing.sessionId);
  });
}

export async function deleteExerciseLog(id: string): Promise<void> {
  await inTx(async () => {
    const [exercise] = await db
      .select({
        session_id: exerciseLogs.session_id,
        exercise_name: exerciseLogs.exercise_name,
      })
      .from(exerciseLogs)
      .where(and(eq(exerciseLogs.id, id), isNull(exerciseLogs.deleted_at)));
    if (!exercise) return;

    const deletedAt = nowIso();
    await db
      .update(setLogs)
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where(and(
        eq(setLogs.exercise_log_id, id),
        isNull(setLogs.deleted_at),
      ));
    await db
      .update(exerciseLogs)
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where(eq(exerciseLogs.id, id));
    await recomputePRsForExercise(exercise.exercise_name);
    await updateSessionVolume(exercise.session_id);
  });
}

// ─── Set Log Queries ──────────────────────────────────────────────────────────

export async function getSetsForExercise(exerciseLogId: string): Promise<SetLog[]> {
  return db
    .select()
    .from(setLogs)
    .where(and(
      eq(setLogs.exercise_log_id, exerciseLogId),
      isNull(setLogs.deleted_at),
    ))
    .orderBy(setLogs.set_number);
}

export async function insertSetLog(set: NewSetLog): Promise<{ isPR: boolean }> {
  return inTx(async () => {
    const exercise = await getExerciseForSet(set.exercise_log_id);
    if (!exercise) throw new Error(`Exercise log ${set.exercise_log_id} was not found.`);
    validateSetMetrics(exercise.exercise_type ?? "weight_reps", set);
    await db.insert(setLogs).values({
      ...set,
      is_pr: 0,
      updated_at: nowIso(),
      deleted_at: null,
    });
    const result = await recomputePRsForExercise(exercise.exercise_name);
    await updateSessionVolume(exercise.session_id);
    return { isPR: result.prSetIds.has(set.id) };
  });
}

export async function deleteSetLog(id: string, exerciseLogId: string): Promise<void> {
  await inTx(async () => {
    const exercise = await getExerciseForSet(exerciseLogId);
    const deletedAt = nowIso();
    await db
      .update(setLogs)
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where(and(eq(setLogs.id, id), isNull(setLogs.deleted_at)));
    if (exercise) {
      await recomputePRsForExercise(exercise.exercise_name);
      await updateSessionVolume(exercise.session_id);
    }
  });
}

export async function updateSetLog(
  id: string,
  updates: Partial<NewSetLog>,
  exerciseLogId: string
): Promise<void> {
  await inTx(async () => {
    const exercise = await getExerciseForSet(exerciseLogId);
    const [existingSet] = await db
      .select()
      .from(setLogs)
      .where(and(eq(setLogs.id, id), isNull(setLogs.deleted_at)));
    if (!exercise || !existingSet) return;
    validateSetMetrics(exercise.exercise_type ?? "weight_reps", {
      weight_kg: updates.weight_kg ?? existingSet.weight_kg,
      reps: updates.reps ?? existingSet.reps,
      duration_sec:
        updates.duration_sec !== undefined
          ? updates.duration_sec
          : existingSet.duration_sec,
      distance_km:
        updates.distance_km !== undefined
          ? updates.distance_km
          : existingSet.distance_km,
    });
    await db
      .update(setLogs)
      .set({ ...updates, updated_at: nowIso() })
      .where(and(eq(setLogs.id, id), isNull(setLogs.deleted_at)));
    await recomputePRsForExercise(exercise.exercise_name);
    await updateSessionVolume(exercise.session_id);
  });
}

// ─── Volume Calculation ───────────────────────────────────────────────────────

export async function updateSessionVolume(sessionId: string): Promise<void> {
  await db
    .update(workoutSessions)
    .set({
      total_volume_kg: sql`(
        SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)
        FROM set_logs s
        JOIN exercise_logs e ON e.id = s.exercise_log_id
        WHERE e.session_id = ${sessionId}
          AND s.deleted_at IS NULL
          AND e.deleted_at IS NULL
          AND COALESCE(s.is_warmup, 0) = 0
          AND COALESCE(e.exercise_type, 'weight_reps') IN ('weight_reps', 'bodyweight_reps')
      )`,
      updated_at: nowIso(),
    })
    .where(and(
      eq(workoutSessions.id, sessionId),
      isNull(workoutSessions.deleted_at),
    ));
}

async function getExerciseForSet(exerciseLogId: string) {
  const [exercise] = await db
    .select({
      exercise_name: exerciseLogs.exercise_name,
      session_id: exerciseLogs.session_id,
      exercise_type: exerciseLogs.exercise_type,
    })
    .from(exerciseLogs)
    .where(and(eq(exerciseLogs.id, exerciseLogId), isNull(exerciseLogs.deleted_at)));
  return exercise;
}

function validateSetMetrics(
  exerciseType: string,
  set: {
    weight_kg: number;
    reps: number;
    duration_sec?: number | null;
    distance_km?: number | null;
  },
): void {
  if (exerciseType === "weight_reps") {
    if (!Number.isFinite(set.weight_kg) || set.weight_kg <= 0 || !Number.isInteger(set.reps) || set.reps < 1) {
      throw new RangeError("Weighted sets require positive load and at least one rep.");
    }
  } else if (exerciseType === "bodyweight_reps") {
    if (!Number.isFinite(set.weight_kg) || set.weight_kg < 0 || !Number.isInteger(set.reps) || set.reps < 1) {
      throw new RangeError("Bodyweight sets require non-negative added load and at least one rep.");
    }
  } else if (exerciseType === "reps_only") {
    if (!Number.isInteger(set.reps) || set.reps < 1) {
      throw new RangeError("Repetition-only sets require at least one rep.");
    }
  } else if (exerciseType === "duration") {
    if (!Number.isInteger(set.duration_sec) || (set.duration_sec ?? 0) < 1) {
      throw new RangeError("Duration sets require a positive duration.");
    }
  } else if (exerciseType === "distance_duration") {
    if (
      !Number.isFinite(set.distance_km) ||
      (set.distance_km ?? 0) <= 0 ||
      !Number.isInteger(set.duration_sec) ||
      (set.duration_sec ?? 0) < 1
    ) {
      throw new RangeError("Distance-duration sets require positive distance and duration.");
    }
  } else {
    throw new Error(`Unsupported exercise type "${exerciseType}".`);
  }
}

export async function recomputePRsForExercise(
  exerciseName: string,
): Promise<ReturnType<typeof derivePRs>> {
  const rows = await db
    .select({
      setId: setLogs.id,
      weightKg: setLogs.weight_kg,
      reps: setLogs.reps,
      date: exerciseLogs.date,
      loggedAt: setLogs.logged_at,
      isWarmup: setLogs.is_warmup,
      isPR: setLogs.is_pr,
      exerciseType: exerciseLogs.exercise_type,
    })
    .from(setLogs)
    .innerJoin(exerciseLogs, eq(setLogs.exercise_log_id, exerciseLogs.id))
    .where(and(
      eq(exerciseLogs.exercise_name, exerciseName),
      isNull(exerciseLogs.deleted_at),
      isNull(setLogs.deleted_at),
    ))
    .orderBy(exerciseLogs.date, setLogs.logged_at);
  const points: SetPoint[] = rows
    .filter(
      (row) =>
        row.exerciseType === "weight_reps" ||
        row.exerciseType === "bodyweight_reps" ||
        row.exerciseType === null,
    )
    .map((row) => ({
      setId: row.setId,
      exerciseName,
      weightKg: row.weightKg,
      reps: row.reps,
      date: row.date,
      loggedAt: row.loggedAt,
      isWarmup: row.isWarmup === 1,
    }));
  const derived = derivePRs(points);
  const changedRows = rows.filter(
    (row) => (row.isPR ?? -1) !== (derived.prSetIds.has(row.setId) ? 1 : 0),
  );
  const updatedAt = nowIso();
  for (let offset = 0; offset < changedRows.length; offset += 400) {
    const batch = changedRows.slice(offset, offset + 400);
    const batchPRs = batch
      .filter((row) => derived.prSetIds.has(row.setId))
      .map((row) => row.setId);
    const prExpression = batchPRs.length > 0
      ? sql`CASE WHEN ${setLogs.id} IN (${sql.join(
          batchPRs.map((setId) => sql`${setId}`),
          sql`, `,
        )}) THEN 1 ELSE 0 END`
      : sql`0`;
    await db
      .update(setLogs)
      .set({ is_pr: prExpression, updated_at: updatedAt })
      .where(inArray(setLogs.id, batch.map((row) => row.setId)));
  }

  const best = derived.bestByExercise.get(exerciseName);
  const [existing] = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.exercise_name, exerciseName));
  if (!best) {
    if (existing && !existing.deleted_at) {
      await db
        .update(personalRecords)
        .set({ deleted_at: updatedAt, updated_at: updatedAt })
        .where(eq(personalRecords.exercise_name, exerciseName));
    }
    return derived;
  }

  const previousBest = existing?.best_weight_kg ?? null;
  const record = {
    exercise_name: exerciseName,
    best_weight_kg: best.weightKg,
    best_reps_at_best_weight: best.reps,
    best_1rm_estimated: best.e1rmKg,
    estimated_1rm_kg: best.e1rmKg,
    best_volume_single_set: best.weightKg * best.reps,
    achieved_date: best.date,
    previous_best_kg: previousBest,
    improvement_pct:
      previousBest !== null && previousBest > 0
        ? ((best.weightKg - previousBest) / previousBest) * 100
        : null,
    updated_at: updatedAt,
    deleted_at: null,
  };
  await db
    .insert(personalRecords)
    .values(record)
    .onConflictDoUpdate({
      target: personalRecords.exercise_name,
      set: record,
    });
  const externalId = buildPersonalRecordExternalId(exerciseName);
  await clearTombstoneInTransaction("personal_record", externalId, externalId);
  return derived;
}

// ─── PR Queries ───────────────────────────────────────────────────────────────

export async function getAllPRs(): Promise<PersonalRecord[]> {
  return db
    .select()
    .from(personalRecords)
    .where(isNull(personalRecords.deleted_at));
}

export async function getPRForExercise(exerciseName: string): Promise<PersonalRecord | null> {
  const result = await db
    .select()
    .from(personalRecords)
    .where(and(
      eq(personalRecords.exercise_name, exerciseName),
      isNull(personalRecords.deleted_at),
    ));
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
  const recentDates = await db
    .select({ date: exerciseLogs.date })
    .from(exerciseLogs)
    .innerJoin(workoutSessions, eq(exerciseLogs.session_id, workoutSessions.id))
    .where(and(
      eq(exerciseLogs.exercise_name, exerciseName),
      isNull(exerciseLogs.deleted_at),
      isNull(workoutSessions.deleted_at),
    ))
    .groupBy(exerciseLogs.date)
    .orderBy(desc(exerciseLogs.date))
    .limit(2);

  if (recentDates.length < 2) {
    return {
      shouldProgress: false,
      message: "Not enough data yet",
      lastTwoSessions: [],
    };
  }

  const exerciseRows = await db
    .select({
      session_id: exerciseLogs.session_id,
      date: exerciseLogs.date,
      exercise_log_id: exerciseLogs.id,
      day_type: workoutSessions.day_type,
    })
    .from(exerciseLogs)
    .innerJoin(workoutSessions, eq(exerciseLogs.session_id, workoutSessions.id))
    .where(and(
      eq(exerciseLogs.exercise_name, exerciseName),
      inArray(exerciseLogs.date, recentDates.map((row) => row.date)),
      isNull(exerciseLogs.deleted_at),
      isNull(workoutSessions.deleted_at),
    ))
    .orderBy(
      desc(exerciseLogs.date),
      desc(workoutSessions.started_at),
      desc(workoutSessions.id),
    );

  const sessionsById = new Map<
    string,
    { sessionId: string; date: string; dayType: string; exerciseLogIds: string[] }
  >();
  const selectedSessionByDate = new Map<string, string>();
  for (const row of exerciseRows) {
    const selectedSessionId = selectedSessionByDate.get(row.date);
    if (selectedSessionId && selectedSessionId !== row.session_id) continue;
    if (!selectedSessionId) {
      selectedSessionByDate.set(row.date, row.session_id);
    }
    let session = sessionsById.get(row.session_id);
    if (!session) {
      session = {
        sessionId: row.session_id,
        date: row.date,
        dayType: row.day_type,
        exerciseLogIds: [],
      };
      sessionsById.set(row.session_id, session);
    }
    session.exerciseLogIds.push(row.exercise_log_id);
  }
  const recentSessions = [...sessionsById.values()];

  const template = recentSessions
    .flatMap((session) => getTemplateForDayType(session.dayType))
    .find((item) => item.name === exerciseName);
  const range: [number, number] = template?.repRange ?? [8, 12];
  const targetSets = template?.targetSets ?? 3;
  const progressionSessions = await Promise.all(
    recentSessions.map(async (session) => {
      const sets = (
        await Promise.all(session.exerciseLogIds.map(getSetsForExercise))
      ).flat();
      return {
        sessionId: session.sessionId,
        date: session.date,
        sets: sets.map((set) => ({
          weightKg: set.weight_kg,
          reps: set.reps,
          isWarmup: set.is_warmup === 1,
        })),
      };
    }),
  );
  const shouldProgress = shouldIncreaseLoad(
    progressionSessions,
    range,
    targetSets,
  );
  const sessionData = progressionSessions.map((session) => {
    const workingSets = session.sets.filter((set) => !set.isWarmup);
    return {
      date: session.date,
      allSetsHit12:
        workingSets.length >= targetSets &&
        workingSets.every((set) => set.reps >= range[1]),
    };
  });

  return {
    shouldProgress,
    message: shouldProgress
      ? `You hit ${targetSets} sets of ${range[1]}+ reps in the last 2 sessions — increase weight today`
      : `Keep working toward ${targetSets} sets of ${range[1]} reps before progressing`,
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
    .where(and(
      eq(exerciseLogs.exercise_name, exerciseName),
      isNull(exerciseLogs.deleted_at),
      or(
        isNull(exerciseLogs.exercise_type),
        inArray(exerciseLogs.exercise_type, ["weight_reps", "bodyweight_reps"]),
      ),
    ))
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
        isNull(workoutSessions.deleted_at),
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

export interface WorkoutDayData {
  session: WorkoutSession | null;
  exercises: ExerciseLog[];
  setsByExercise: Record<string, SetLog[]>;
  customExercises: CustomExercise[];
  completedDayTypes: Set<string>;
}

export async function getWorkoutDay(date: string): Promise<WorkoutDayData> {
  const monday = startOfWeekMonday(date);
  const sunday = addDays(monday, 6);
  const [sessions, customExerciseRows, weekSessions] = await Promise.all([
    getSessionsForDate(date),
    getCustomExercises(),
    getSessionsInRange(monday, sunday),
  ]);
  const session = sessions[0] ?? null;
  const exercises = session ? await getExercisesForSession(session.id) : [];
  const setsEntries = await Promise.all(
    exercises.map(async (exercise) => [
      exercise.id,
      await getSetsForExercise(exercise.id),
    ] as const),
  );

  return {
    session,
    exercises,
    setsByExercise: Object.fromEntries(setsEntries),
    customExercises: customExerciseRows,
    completedDayTypes: new Set(weekSessions.map((item) => item.day_type)),
  };
}

export async function insertCustomExercise(exercise: NewCustomExercise): Promise<void> {
  await inTx(async () => {
    await db.insert(customExercises).values(exercise).onConflictDoNothing();
  });
}
