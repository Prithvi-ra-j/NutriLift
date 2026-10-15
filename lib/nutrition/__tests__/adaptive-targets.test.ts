import { estimateAdaptiveTarget, type AdaptiveTargetInput } from "../adaptive-targets";

function sampleInput(): AdaptiveTargetInput {
  const intakeDays = Array.from({ length: 14 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + index, 12)).toISOString().slice(0, 10),
    calories: 2200,
    complete: true,
    quality: "reviewed" as const,
  }));
  const weights = [
    { date: "2026-01-01", weightKg: 75 },
    { date: "2026-01-04", weightKg: 74.9 },
    { date: "2026-01-07", weightKg: 74.8 },
    { date: "2026-01-10", weightKg: 74.7 },
    { date: "2026-01-14", weightKg: 74.6 },
  ];
  return { intakeDays, weights, currentTargetKcal: 2500, goal: "lose" };
}

describe("estimateAdaptiveTarget", () => {
  it("requires enough complete reviewed intake history and weigh-ins", () => {
    const input = sampleInput();
    input.intakeDays = input.intakeDays.slice(0, 5);
    expect(estimateAdaptiveTarget(input).status).toBe("insufficient-data");
  });

  it("ignores incomplete, estimated, unresolved and impossible-date records", () => {
    const input = sampleInput();
    input.intakeDays[0] = { ...input.intakeDays[0], complete: false };
    input.intakeDays[1] = { ...input.intakeDays[1], quality: "unresolved" };
    input.intakeDays[2] = { ...input.intakeDays[2], quality: "estimated" };
    input.intakeDays[3] = { ...input.intakeDays[3], date: "2026-02-30" };
    const result = estimateAdaptiveTarget(input);
    expect(result.qualifiedIntakeDays).toBe(10);
    expect(result.status).toBe("insufficient-data");
  });

  it("caps recommendations to ±150 kcal and never applies them", () => {
    const result = estimateAdaptiveTarget(sampleInput());
    expect(result.status).toBe("ready");
    expect(Math.abs(result.changeFromCurrentKcal ?? 9999)).toBeLessThanOrEqual(150);
    expect(result.suggestedTargetKcal).toBe(result.changeFromCurrentKcal! + 2500);
  });

  it("deduplicates same-day weigh-ins and ignores invalid weights", () => {
    const input = sampleInput();
    input.weights.push({ date: "2026-01-14", weightKg: 74.5 });
    input.weights.push({ date: "2026-02-30", weightKg: 74.4 });
    const result = estimateAdaptiveTarget(input);
    expect(result.qualifiedWeighIns).toBe(5);
    expect(result.status).toBe("ready");
  });

  it("rejects unsupported targets and goals", () => {
    const input = sampleInput();
    input.currentTargetKcal = 0;
    expect(estimateAdaptiveTarget(input).status).toBe("invalid-data");

    const invalidGoal = { ...sampleInput(), goal: "extreme" as unknown as "lose" };
    expect(estimateAdaptiveTarget(invalidGoal).status).toBe("invalid-data");
  });

  it("does not estimate weight change from measurements too close together", () => {
    const input = sampleInput();
    input.weights = input.weights.map((item, index) => ({
      ...item,
      date: `2026-01-${String(1 + index).padStart(2, "0")}`,
    }));
    expect(estimateAdaptiveTarget(input).status).toBe("insufficient-data");
  });
});
