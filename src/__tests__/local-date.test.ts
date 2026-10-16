import { addCalendarDays, calendarDaysBetween, toLocalDateKey } from "../../lib/utils/local-date";

describe("local calendar date helpers", () => {
  it("formats a local date without converting it to UTC", () => {
    expect(toLocalDateKey(new Date(2026, 9, 11, 0, 15))).toBe("2026-10-11");
  });

  it("adds calendar days across month and year boundaries", () => {
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCalendarDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("calculates inclusive windows using calendar-day distance", () => {
    expect(calendarDaysBetween("2026-10-01", "2026-10-14")).toBe(13);
  });
});
