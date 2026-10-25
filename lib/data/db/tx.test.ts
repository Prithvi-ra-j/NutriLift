import { DatabaseSync } from "node:sqlite";
import { inTx } from "./tx";

let mockDatabase: {
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
} = {
  withTransactionAsync: async () => {
    throw new Error("The test SQLite database has not been initialized.");
  },
};

jest.mock("./client", () => ({
  sqlite: {
    withTransactionAsync: (task: () => Promise<void>) =>
      mockDatabase.withTransactionAsync(task),
  },
}));

describe("inTx", () => {
  let native: DatabaseSync;

  beforeEach(() => {
    native = new DatabaseSync(":memory:");
    native.exec(`
      CREATE TABLE food_logs (id TEXT PRIMARY KEY, calories REAL NOT NULL);
      CREATE TABLE daily_nutrition (date TEXT PRIMARY KEY, calories REAL NOT NULL);
    `);
    mockDatabase = {
      withTransactionAsync: async (task) => {
        native.exec("BEGIN");
        try {
          await task();
          native.exec("COMMIT");
        } catch (error) {
          native.exec("ROLLBACK");
          throw error;
        }
      },
    };
  });

  afterEach(() => {
    native.close();
  });

  it("commits source and derived writes together", async () => {
    await inTx(async () => {
      native
        .prepare("INSERT INTO food_logs (id, calories) VALUES (?, ?)")
        .run("food-1", 120);
      native
        .prepare("INSERT INTO daily_nutrition (date, calories) VALUES (?, ?)")
        .run("2026-10-25", 120);
    });

    expect(native.prepare("SELECT COUNT(*) AS count FROM food_logs").get()).toEqual({
      count: 1,
    });
    expect(
      native.prepare("SELECT calories FROM daily_nutrition WHERE date = ?").get("2026-10-25"),
    ).toEqual({ calories: 120 });
  });

  it("rolls back source and derived writes when recomputation fails", async () => {
    await expect(
      inTx(async () => {
        native
          .prepare("INSERT INTO food_logs (id, calories) VALUES (?, ?)")
          .run("food-1", 120);
        native
          .prepare("INSERT INTO daily_nutrition (date, calories) VALUES (?, ?)")
          .run("2026-10-25", 120);
        throw new Error("recompute failed");
      }),
    ).rejects.toThrow("recompute failed");

    expect(native.prepare("SELECT COUNT(*) AS count FROM food_logs").get()).toEqual({
      count: 0,
    });
    expect(
      native.prepare("SELECT COUNT(*) AS count FROM daily_nutrition").get(),
    ).toEqual({ count: 0 });
  });
});
