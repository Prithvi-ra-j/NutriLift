import { DatabaseSync } from "node:sqlite";
import { drizzle as drizzleProxy } from "drizzle-orm/sqlite-proxy";
import { getWorkoutDay } from "./workout";
import type { MigrationDatabase } from "../migrations/runner";
import { migrations } from "../migrations";
import * as schema from "../schema";

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

jest.mock("../client", () => ({
  get db() {
    if (!mockDatabase) throw new Error("The test Drizzle database is not initialized.");
    return mockDatabase;
  },
  sqlite: {
    withTransactionAsync: (task: () => Promise<void>) => mockWithTransaction(task),
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
});
