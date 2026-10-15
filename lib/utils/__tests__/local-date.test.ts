import {
  addCalendarDays,
  fromLocalDateKey,
  getMondayWeekRange,
  isSameLocalCalendarDay,
  toLocalDateKey,
} from "../local-date";

describe("local calendar date utilities", () => {
  it("formats the local calendar date instead of converting through UTC", () => {
    const localDate = new Date(2026, 9, 15, 0, 5, 0);
    expect(toLocalDateKey(localDate)).toBe("2026-10-15");
  });

  it("parses a date-only key as local midnight", () => {
    const date = fromLocalDateKey("2026-10-15");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });

  it.each(["2026-2-01", "2026-02-30", "not-a-date"])(
    "rejects invalid date keys: %s",
    (dateKey) => {
      expect(() => fromLocalDateKey(dateKey)).toThrow(RangeError);
    },
  );

  it("adds calendar days across month and year boundaries", () => {
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("uses a Monday-to-Sunday range when selected date is Sunday", () => {
    expect(getMondayWeekRange("2026-10-18")).toEqual({
      start: "2026-10-12",
      end: "2026-10-18",
    });
  });

  it("keeps Monday in the same Monday-to-Sunday range", () => {
    expect(getMondayWeekRange("2026-10-12")).toEqual({
      start: "2026-10-12",
      end: "2026-10-18",
    });
  });

  it("compares dates by local calendar day rather than timestamp", () => {
    expect(
      isSameLocalCalendarDay(
        new Date(2026, 9, 15, 0, 1),
        new Date(2026, 9, 15, 23, 59),
      ),
    ).toBe(true);
    expect(
      isSameLocalCalendarDay(new Date(2026, 9, 15), new Date(2026, 9, 16)),
    ).toBe(false);
  });
});
