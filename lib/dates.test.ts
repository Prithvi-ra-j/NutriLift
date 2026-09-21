import { getLocalDateKey, getDateDaysAgo, addDaysToDateKey, parseDateKey } from "./dates";

describe("local date utilities", () => {
  it("formats the local calendar date without UTC conversion", () => {
    const d = new Date(2026, 8, 21, 23, 59, 0);
    expect(getLocalDateKey(d)).toBe("2026-09-21");
  });

  it("moves calendar days correctly", () => {
    const d = new Date(2026, 8, 1, 12);
    expect(getDateDaysAgo(1, d)).toBe("2026-08-31");
    expect(addDaysToDateKey("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("round trips a date key", () => {
    expect(getLocalDateKey(parseDateKey("2026-12-31"))).toBe("2026-12-31");
  });
});
