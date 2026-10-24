import { rollingBodyAverage } from "../body-averages";

describe("rollingBodyAverage", () => {
  it("averages measurements within the seven calendar days ending on the selected date", () => {
    expect(rollingBodyAverage([
      { date: "2026-01-01", weight_kg: 80 },
      { date: "2026-01-10", weight_kg: 70 },
      { date: "2026-01-12", weight_kg: 72 },
      { date: "2026-01-15", weight_kg: null },
    ], "weight_kg", "2026-01-15")).toBe(71);
  });

  it("returns null when the seven-day window has no measurements", () => {
    expect(rollingBodyAverage([
      { date: "2026-01-01", body_fat_pct: 20 },
    ], "body_fat_pct", "2026-01-15")).toBeNull();
  });
});
