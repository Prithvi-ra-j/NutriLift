import {
  addCalendarDays,
  differenceInCalendarDays,
  fromLocalDateKey,
  getMondayWeekRange,
  getSundayWeekRange,
  toLocalDateKey,
} from "../../lib/utils/local-date";

describe("local calendar date keys", () => {
  it("rejects impossible dates instead of normalizing them", () => {
    expect(() => fromLocalDateKey("2026-02-29")).toThrow("Invalid calendar date");
    expect(() => fromLocalDateKey("2026-13-01")).toThrow("Invalid calendar date");
    expect(() => fromLocalDateKey("2026-1-01")).toThrow("expected YYYY-MM-DD");
  });

  it("moves across month and year boundaries using calendar days", () => {
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("rejects fractional day offsets", () => {
    expect(() => addCalendarDays("2026-01-01", 0.5)).toThrow("must be an integer");
  });

  it("calculates week ranges with explicit Sunday and Monday starts", () => {
    expect(getSundayWeekRange("2026-10-15")).toEqual({ start: "2026-10-11", end: "2026-10-17" });
    expect(getMondayWeekRange("2026-10-15")).toEqual({ start: "2026-10-12", end: "2026-10-18" });
  });

  it("computes calendar-day differences without elapsed-hour assumptions", () => {
    expect(differenceInCalendarDays("2026-03-01", "2026-02-28")).toBe(1);
    expect(differenceInCalendarDays("2025-01-01", "2024-12-31")).toBe(1);
  });

  it("formats a Date using the device's local calendar fields", () => {
    const date = new Date(2026, 9, 15, 0, 5, 0);
    expect(toLocalDateKey(date)).toBe("2026-10-15");
  });
});
