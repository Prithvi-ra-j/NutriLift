import { estimateAdaptiveTarget, type CompleteIntakeDay, type WeightMeasurement } from "../../lib/nutrition/adaptive-targets";

function sampleInput() {
  const intakeDays: CompleteIntakeDay[] = Array.from({ length: 14 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + index, 12)).toISOString().slice(0, 10),
    calories: 2200,
    complete: true,
    quality: "reviewed",
  }));
  const weights: WeightMeasurement[] = [
    { date: "2026-01-01", weightKg: 75 },
    { date: "2026-01-04", weightKg: 74.9 },
    { date: "2026-01-07", weightKg: 74.8 },
    { date: "2026-01-10", weightKg: 74.7 },
    { date: "2026-01-14", weightKg: 74.6 },
  ];
  return { intakeDays, weights, currentTargetKcal: 2500, goal: "lose" as const };
}

describe("adaptive calorie target estimator", () => {
  it("does not estimate with insufficient history", () => {
    const input = sampleInput();
    input.intakeDays = input.intakeDays.slice(0, 5);
    expect(estimateAdaptiveTarget(input).status).toBe("insufficient-data");
  });

  it("ignores incomplete and unresolved intake days", () => {
    const input = sampleInput();
    input.intakeDays = input.intakeDays.map((day) => ({ ...day, complete: false, quality: "unresolved" }));
    const result = estimateAdaptiveTarget(input);
    expect(result.status).toBe("insufficient-data");
    expect(result.qualifiedIntakeDays).toBe(0);
  });

  it("caps a recommendation to a maximum 150 kcal change", () => {
    const result = estimateAdaptiveTarget(sampleInput());
    expect(result.status).toBe("ready");
    expect(Math.abs(result.changeFromCurrentKcal ?? 9999)).toBeLessThanOrEqual(150);
  });

  it("deduplicates same-day weigh-ins and ignores invalid measurements", () => {
    const input = sampleInput();
    input.weights.push({ date: "2026-01-14", weightKg: 999 });
    const result = estimateAdaptiveTarget(input);
    expect(result.qualifiedWeighIns).toBe(4);
    expect(result.status).toBe("insufficient-data");
  });

  it("rejects invalid current targets", () => {
    const input = sampleInput();
    input.currentTargetKcal = 0;
    expect(estimateAdaptiveTarget(input).status).toBe("invalid-data");
  });
});
