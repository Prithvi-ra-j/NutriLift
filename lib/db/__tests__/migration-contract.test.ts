import { findMissingRequiredTables, REQUIRED_CORE_TABLES } from "../migration-contract";

describe("local database migration contract", () => {
  it("accepts a database containing every required core table", () => {
    expect(findMissingRequiredTables(new Set(REQUIRED_CORE_TABLES))).toEqual([]);
  });

  it("identifies missing core tables, including custom exercises", () => {
    const existing = new Set(REQUIRED_CORE_TABLES.filter((table) => table !== "custom_exercises"));
    expect(findMissingRequiredTables(existing)).toEqual(["custom_exercises"]);
  });

  it("reports all missing required tables in stable order", () => {
    expect(findMissingRequiredTables(new Set())).toEqual([...REQUIRED_CORE_TABLES]);
  });
});
