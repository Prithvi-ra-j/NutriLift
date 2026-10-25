import {
  addDays,
  daysBetween,
  dayOfWeek,
  isLocalDateString,
  localDateString,
  parseLocalDate,
  startOfWeekMonday,
} from "../localDate";

describe("localDateString", () => {
  it("runs the test environment in the app's IST timezone", () => {
    expect(new Date("2026-01-01T00:00:00Z").getTimezoneOffset()).toBe(-330);
  });

  it("formats the calendar date in local time", () => {
    const date = new Date(2025, 0, 2, 23, 30);

    expect(localDateString(date)).toBe("2025-01-02");
  });
});

describe("local calendar arithmetic", () => {
  it("parses valid dates as local calendar dates and rejects invalid dates", () => {
    expect(localDateString(parseLocalDate("2026-02-28"))).toBe("2026-02-28");
    expect(isLocalDateString("2026-02-29")).toBe(false);
    expect(() => parseLocalDate("2026-02-29")).toThrow(RangeError);
  });

  it("handles month ends and leap days without UTC conversion", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("uses Monday as the start of the week, including for Sunday", () => {
    expect(dayOfWeek("2026-10-18")).toBe(0);
    expect(startOfWeekMonday("2026-10-18")).toBe("2026-10-12");
  });

  it("calculates calendar-day differences across DST transitions", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
      expect(daysBetween("2026-11-01", "2026-10-31")).toBe(-1);
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("formats UTC instants according to the local timezone calendar day", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      expect(localDateString(new Date("2026-10-17T20:00:00Z"))).toBe("2026-10-18");
      expect(localDateString(new Date("2026-10-17T18:29:00Z"))).toBe("2026-10-17");
      expect(localDateString(new Date("2026-10-17T23:30:00Z"))).toBe("2026-10-18");
      expect(localDateString(new Date("2026-10-17T19:00:00Z"))).toBe("2026-10-18");
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("adds local calendar days across both daylight-saving transitions", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
      expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
});
