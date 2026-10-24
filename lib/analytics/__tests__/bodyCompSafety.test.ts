import {
  canCommentOnBodyComp,
  getEligibleBodyCompTimeOfDay,
} from "../bodyCompSafety";

describe("body-composition comment gate", () => {
  it("requires at least three measurements spanning 14 days with the same time tag", () => {
    expect(canCommentOnBodyComp([
      { date: "2026-01-01", measurement_time_of_day: "morning" },
      { date: "2026-01-08", measurement_time_of_day: "morning" },
      { date: "2026-01-15", measurement_time_of_day: "morning" },
    ])).toBe(true);
  });

  it("rejects too few measurements, short spans, and mixed tags", () => {
    expect(canCommentOnBodyComp([
      { date: "2026-01-01", measurement_time_of_day: "morning" },
      { date: "2026-01-15", measurement_time_of_day: "morning" },
    ])).toBe(false);
    expect(canCommentOnBodyComp([
      { date: "2026-01-01", measurement_time_of_day: "morning" },
      { date: "2026-01-08", measurement_time_of_day: "morning" },
      { date: "2026-01-14", measurement_time_of_day: "morning" },
    ])).toBe(false);
    expect(canCommentOnBodyComp([
      { date: "2026-01-01", measurement_time_of_day: "morning" },
      { date: "2026-01-08", measurement_time_of_day: "afternoon" },
      { date: "2026-01-15", measurement_time_of_day: "evening" },
    ])).toBe(false);
  });

  it("uses only dates in a qualifying same-time group", () => {
    expect(getEligibleBodyCompTimeOfDay([
      { date: "2026-01-01", measurement_time_of_day: "morning" },
      { date: "2026-01-08", measurement_time_of_day: "morning" },
      { date: "2026-01-15", measurement_time_of_day: "morning" },
      { date: "2026-01-20", measurement_time_of_day: "evening" },
    ])).toBe("morning");
  });
});
