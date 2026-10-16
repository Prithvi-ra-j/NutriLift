import { computeBodySummary } from "../body-analytics";

const stat = (date: string, weight_kg: number) => ({
  id: date, date, type: "weight", weight_kg,
}) as any;

const inBody = {
  id: "inbody", date: "2026-10-16", type: "inbody", weight_kg: 74.5, body_fat_pct: 34,
} as any;

describe("body analytics", () => {
  it("does not invent a weight trend or projection from sparse measurements", () => {
    const summary = computeBodySummary([stat("2026-10-16", 74.5)], inBody, {
      targetBodyFatPct: 22, goalDate: "2027-12-31",
    });
    expect(summary.weightChange7d).toBeNull();
    expect(summary.weightChange30d).toBeNull();
    expect(summary.projectedBFDate).toBeNull();
    expect(summary.onTrackForGoal).toBe(false);
  });

  it("requires an explicit goal and observed downward trend before projecting", () => {
    const history = [stat("2026-10-09", 75), stat("2026-10-16", 74.5)];
    expect(computeBodySummary(history, inBody).projectedBFDate).toBeNull();
    const summary = computeBodySummary(history, inBody, {
      targetBodyFatPct: 22, goalDate: "2027-12-31",
    });
    expect(summary.weightChange7d).toBe(-0.5);
    expect(summary.projectedBFDate).not.toBeNull();
  });

  it("does not project from a stable or gaining weight trend", () => {
    const stable = [stat("2026-10-09", 74.5), stat("2026-10-16", 74.5)];
    expect(computeBodySummary(stable, inBody, {
      targetBodyFatPct: 22, goalDate: "2027-12-31",
    }).projectedBFDate).toBeNull();
  });
});
