import { DatabaseSync } from "node:sqlite";
import { drizzle as drizzleProxy } from "drizzle-orm/sqlite-proxy";
import {
  deleteFoodLog,
  getDailyNutrition,
  getNutritionDay,
  insertFoodLogs,
  restoreFoodLog,
  updateFoodLog,
} from "./nutrition";
import type { MigrationDatabase } from "../db/migrations/runner";
import { migrations } from "../db/migrations";
import * as schema from "../db/schema";

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

function createFoodLog(id: string, calories: number) {
  return {
    id,
    date: "2025-01-02",
    meal: "breakfast",
    name: "Fixture food",
    quantity_g: 100,
    calories,
    protein_g: 10,
    carbs_g: 20,
    fat_g: 5,
    source: "manual",
    created_at: 1735778400,
  };
}

describe("nutrition repository on SQLite", () => {
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

  it("inserts multiple logs and recomputes one daily aggregate from real rows", async () => {
    const result = await insertFoodLogs([
      createFoodLog("food-1", 300),
      createFoodLog("food-2", 200),
    ]);

    expect(result.saved.map((log) => log.id)).toEqual(["food-1", "food-2"]);
    expect(result.saved[0]).toMatchObject({
      quantity_g: 100,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      raw_input: null,
      deleted_at: null,
    });
    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0]?.total_calories).toBe(500);
    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM food_logs").get(),
    ).toEqual({ count: 2 });
    await expect(getDailyNutrition("2025-01-02")).resolves.toMatchObject({
      total_calories: 500,
      total_protein_g: 20,
      total_carbs_g: 40,
      total_fat_g: 10,
      food_count: 2,
      targets_snapshot: JSON.stringify({
        calories: 2200,
        protein_g: 130,
        carbs_g: 250,
        fat_g: 70,
      }),
    });
  });

  it("returns a serializable nutrition screen snapshot for the selected date", async () => {
    await insertFoodLogs([
      createFoodLog("food-1", 300),
      createFoodLog("food-2", 200),
    ]);

    const day = await getNutritionDay("2025-01-02", "2025-01-02");

    expect(day.nutrition?.total_calories).toBe(500);
    expect(day.foodLogs.map((log) => log.id)).toEqual(["food-1", "food-2"]);
    expect(day.last7Days.map((entry) => entry.date)).toEqual(["2025-01-02"]);
    expect(Object.keys(day.proteinTargetsByDate)).toEqual([
      "2024-12-27",
      "2024-12-28",
      "2024-12-29",
      "2024-12-30",
      "2024-12-31",
      "2025-01-01",
      "2025-01-02",
    ]);
    expect(JSON.parse(JSON.stringify(day))).toEqual(day);
  });

  it("soft-deletes a food log and recomputes the aggregate without removing its row", async () => {
    await insertFoodLogs([
      createFoodLog("food-1", 300),
      createFoodLog("food-2", 200),
    ]);

    await deleteFoodLog("food-1", "2025-01-02");

    expect(
      mockNative?.prepare("SELECT COUNT(*) AS count FROM food_logs").get(),
    ).toEqual({ count: 2 });
    expect(
      mockNative
        ?.prepare("SELECT deleted_at FROM food_logs WHERE id = 'food-1'")
        .get(),
    ).toEqual(expect.objectContaining({ deleted_at: expect.any(String) }));
    await expect(getDailyNutrition("2025-01-02")).resolves.toMatchObject({
      total_calories: 200,
      food_count: 1,
    });
  });

  it("restores a soft-deleted food log with its original values", async () => {
    await insertFoodLogs([createFoodLog("food-1", 300)]);
    const deleted = await deleteFoodLog("food-1", "2025-01-02");
    const restored = await restoreFoodLog("food-1", "2025-01-02");

    expect(deleted.saved[0]?.deleted_at).toEqual(expect.any(String));
    expect(restored.saved[0]).toMatchObject({
      id: "food-1",
      date: "2025-01-02",
      name: "Fixture food",
      calories: 300,
      protein_g: 10,
      deleted_at: null,
    });
    expect(restored.saved[0]?.updated_at).not.toBe(deleted.saved[0]?.updated_at);
    expect(restored.summaries[0]?.total_calories).toBe(300);
  });

  it("returns the persisted food log and summaries after an update", async () => {
    await insertFoodLogs([createFoodLog("food-1", 300)]);

    const result = await updateFoodLog(
      "food-1",
      { calories: 450, name: "Updated fixture" },
      "2025-01-02",
    );

    expect(result.saved).toHaveLength(1);
    expect(result.saved[0]).toMatchObject({
      id: "food-1",
      name: "Updated fixture",
      calories: 450,
      updated_at: expect.any(String),
      deleted_at: null,
    });
    expect(result.summaries.map((summary) => summary.total_calories)).toEqual([
      450,
    ]);
  });
});
