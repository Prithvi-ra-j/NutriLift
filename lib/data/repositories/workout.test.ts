import { DatabaseSync } from "node:sqlite";
import { drizzle as drizzleProxy } from "drizzle-orm/sqlite-proxy";
import {
  deleteSetLog,
  addTemplateExercises,
  getWorkoutDay,
  insertSetLog,
  updateSetLog,
} from "./workout";
import type { MigrationDatabase } from "../db/migrations/runner";
import { migrations } from "../db/migrations";
import * as schema from "../db/schema";
import { derivePRs } from "../../domain/prs";

let mockNative: DatabaseSync | null = null;
let mockDatabase: ReturnType<typeof drizzleProxy> | null = null;

async function mockWithTransaction(task: () => Promise<void>): Promise<void> {
  if (!mockNative) throw new Error("The test SQLite database is not initialized.");
  mockNative.exec("BEGIN");
  try {
    await task();
    mockNative.exec("COMMIT");
  } catch (error) {
    mockNative.exec("ROLLBACK");
    throw error;
  }
}

jest.mock("../db/client", () => ({
  get db() {
    if (!mockDatabase) throw new Error("The test Drizzle database is not initialized.");
    return mockDatabase;
  },
  sqlite: {
    withTransactionAsync: (task: () => Promise<void>) => mockWithTransaction(task),
    runAsync: async (source: string, params: unknown[] = []) => {
      if (!mockNative) throw new Error("The test SQLite database is not initialized.");
      const result = mockNative.prepare(source).run(...params as (string | number | null)[]);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
  },
}));

jest.mock("../../logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

async function migrateTestDatabase(native: DatabaseSync): Promise<void> {
  const database: MigrationDatabase = {
    execAsync: async (source) => {
      native.exec(source);
    },
    getFirstAsync: async <T>(source: string) => {
      return (native.prepare(source).get() as T | undefined) ?? null;
    },
    getAllAsync: async <T>(source: string) => {
      return native.prepare(source).all() as T[];
    },
    withTransactionAsync: mockWithTransaction,
  };
  await migrations.reduce(
    async (previous, migration) => {
      await previous;
      await database.withTransactionAsync(async () => {
        await migration.up(database);
        await database.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
    },
    Promise.resolve(),
  );
}

describe("workout day repository on SQLite", () => {
  beforeEach(async () => {
    mockNative = new DatabaseSync(":memory:");
    mockNative.exec("PRAGMA foreign_keys = ON");
    mockDatabase = drizzleProxy(
      async (source, params, method) => {
        if (!mockNative) throw new Error("The test SQLite database is not initialized.");
        const statement = mockNative.prepare(source);
        if (method === "run") {
          statement.run(...params);
          return { rows: [] };
        }
        if (method === "get") {
          const row = statement.get(...params);
          return { rows: row ? Object.values(row) : [] };
        }
        return {
          rows: statement.all(...params).map((row) => Object.values(row)),
        };
      },
      { schema },
    );
    await migrateTestDatabase(mockNative);
  });

  afterEach(() => {
    mockNative?.close();
    mockNative = null;
    mockDatabase = null;
  });

  async function expectPrStorageToMatchDerived(): Promise<void> {
    if (!mockNative) throw new Error("The test SQLite database is not initialized.");
    const rows = mockNative.prepare(`
      SELECT s.id AS setId, e.exercise_name AS exerciseName, s.weight_kg AS weightKg,
        s.reps, e.date, s.logged_at AS loggedAt, s.is_warmup AS isWarmup, s.is_pr AS isPR,
        e.exercise_type AS exerciseType
      FROM set_logs s
      JOIN exercise_logs e ON e.id = s.exercise_log_id
      WHERE s.deleted_at IS NULL AND e.deleted_at IS NULL
      ORDER BY e.date, s.logged_at, s.id
    `).all() as Array<{
      setId: string;
      exerciseName: string;
      weightKg: number;
      reps: number;
      date: string;
      loggedAt: number;
      isWarmup: number | null;
      isPR: number | null;
      exerciseType: string | null;
    }>;
    const strengthRows = rows.filter((row) =>
      row.exerciseType === "weight_reps" || row.exerciseType === "bodyweight_reps",
    );
    const derived = derivePRs(strengthRows.map((row) => ({
      setId: row.setId,
      exerciseName: row.exerciseName,
      weightKg: row.weightKg,
      reps: row.reps,
      date: row.date,
      loggedAt: row.loggedAt,
      isWarmup: row.isWarmup === 1,
    })));

    for (const row of rows) {
      expect(row.isPR).toBe(derived.prSetIds.has(row.setId) ? 1 : 0);
    }

    const records = mockNative.prepare(
      "SELECT exercise_name, best_weight_kg, best_1rm_estimated, achieved_date FROM personal_records WHERE deleted_at IS NULL",
    ).all() as Array<{
      exercise_name: string;
      best_weight_kg: number;
      best_1rm_estimated: number;
      achieved_date: string;
    }>;
    for (const record of records) {
      const best = derived.bestByExercise.get(record.exercise_name);
      expect(best).toBeDefined();
      expect(record).toMatchObject({
        best_weight_kg: best?.weightKg,
        best_1rm_estimated: best?.e1rmKg,
        achieved_date: best?.date,
      });
    }
  }

  it("loads selected session data and completed types for its Monday-based week", async () => {
    mockNative?.exec(`
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('selected', '2026-10-18', 'Cardio', 1, 0);
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('monday', '2026-10-12', 'Push A', 1, 0);
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('prior-week', '2026-10-11', 'Pull B', 1, 0);
      INSERT INTO exercise_logs (
        id, session_id, date, exercise_name, exercise_type, order_in_session
      ) VALUES ('exercise', 'selected', '2026-10-18', 'Squat', 'weight_reps', 1);
      INSERT INTO set_logs (
        id, exercise_log_id, set_number, weight_kg, reps, logged_at
      ) VALUES ('set', 'exercise', 1, 80, 5, 1);
      INSERT INTO custom_exercises (id, exercise_name, exercise_type, created_at)
      VALUES ('custom', 'Custom Lift', 'weight_reps', 1);
    `);

    const day = await getWorkoutDay("2026-10-18");

    expect(day.session?.id).toBe("selected");
    expect(day.exercises.map((exercise) => exercise.id)).toEqual(["exercise"]);
    expect(day.setsByExercise.exercise?.map((set) => set.id)).toEqual(["set"]);
    expect(day.customExercises.map((exercise) => exercise.id)).toEqual(["custom"]);
    expect([...day.completedDayTypes].sort()).toEqual(["Cardio", "Push A"]);
  });

  it("recomputes PR flags and the record after set edits and deletion", async () => {
    mockNative?.exec(`
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('first-session', '2026-10-19', 'Push A', 1, 0);
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('second-session', '2026-10-21', 'Push A', 2, 0);
      INSERT INTO exercise_logs (id, session_id, date, exercise_name, exercise_type, order_in_session)
      VALUES ('first-exercise', 'first-session', '2026-10-19', 'Squat', 'weight_reps', 1);
      INSERT INTO exercise_logs (id, session_id, date, exercise_name, exercise_type, order_in_session)
      VALUES ('second-exercise', 'second-session', '2026-10-21', 'Squat', 'weight_reps', 1);
    `);

    await insertSetLog({
      id: "first-set",
      exercise_log_id: "first-exercise",
      set_number: 1,
      weight_kg: 75,
      reps: 20,
      logged_at: 1,
      is_warmup: 0,
    });
    await insertSetLog({
      id: "second-set",
      exercise_log_id: "second-exercise",
      set_number: 1,
      weight_kg: 80,
      reps: 1,
      logged_at: 2,
      is_warmup: 0,
    });
    await expectPrStorageToMatchDerived();
    expect(
      mockNative?.prepare("SELECT best_weight_kg FROM personal_records WHERE exercise_name = 'Squat'").get(),
    ).toEqual({ best_weight_kg: 75 });

    await updateSetLog("second-set", { weight_kg: 110 }, "second-exercise");
    await expectPrStorageToMatchDerived();
    expect(
      mockNative?.prepare("SELECT best_weight_kg FROM personal_records WHERE exercise_name = 'Squat'").get(),
    ).toEqual({ best_weight_kg: 110 });

    await deleteSetLog("second-set", "second-exercise");
    await expectPrStorageToMatchDerived();
    expect(
      mockNative?.prepare("SELECT best_weight_kg FROM personal_records WHERE exercise_name = 'Squat'").get(),
    ).toEqual({ best_weight_kg: 75 });
  });

  it("accepts pull-up and plank sets without treating duration as strength data", async () => {
    mockNative?.exec(`
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('bodyweight-session', '2026-10-22', 'Pull A', 1, 0);
      INSERT INTO exercise_logs (id, session_id, date, exercise_name, exercise_type, order_in_session)
      VALUES ('pullups', 'bodyweight-session', '2026-10-22', 'Pull-ups', 'bodyweight_reps', 1);
      INSERT INTO exercise_logs (id, session_id, date, exercise_name, exercise_type, order_in_session)
      VALUES ('plank', 'bodyweight-session', '2026-10-22', 'Plank', 'duration', 2);
    `);

    await insertSetLog({
      id: "pull-up-set",
      exercise_log_id: "pullups",
      set_number: 1,
      weight_kg: 0,
      reps: 8,
      logged_at: 1,
      is_warmup: 0,
    });
    await insertSetLog({
      id: "plank-set",
      exercise_log_id: "plank",
      set_number: 1,
      weight_kg: 0,
      reps: 0,
      duration_sec: 60,
      logged_at: 2,
      is_warmup: 0,
    });

    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM set_logs").get(),
    ).toEqual({ count: 2 });
    expect(
      mockNative?.prepare("SELECT exercise_name FROM personal_records WHERE deleted_at IS NULL").all(),
    ).toEqual([{ exercise_name: "Pull-ups" }]);
    expect(
      mockNative?.prepare("SELECT total_volume_kg FROM workout_sessions WHERE id = 'bodyweight-session'").get(),
    ).toEqual({ total_volume_kg: 0 });
    await expectPrStorageToMatchDerived();
  });

  it("appends template exercises after the existing exercise order", async () => {
    mockNative?.exec(`
      INSERT INTO workout_sessions (id, date, day_type, started_at, total_volume_kg)
      VALUES ('template-session', '2026-10-23', 'Push A', 1, 0);
      INSERT INTO exercise_logs (
        id, session_id, date, exercise_name, exercise_type, order_in_session
      ) VALUES ('existing-exercise', 'template-session', '2026-10-23', 'Existing Lift', 'weight_reps', 4);
    `);

    await addTemplateExercises("template-session", ["Bench Press", "Overhead Press"]);

    expect(
      mockNative?.prepare(
        "SELECT exercise_name, order_in_session FROM exercise_logs WHERE session_id = 'template-session' ORDER BY order_in_session",
      ).all(),
    ).toEqual([
      { exercise_name: "Existing Lift", order_in_session: 4 },
      { exercise_name: "Bench Press", order_in_session: 5 },
      { exercise_name: "Overhead Press", order_in_session: 6 },
    ]);
  });
});
