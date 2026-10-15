import { generateCoachRecommendations, type CoachStateSnapshot } from "./coach-recommendations";

const base: CoachStateSnapshot = {
  localDate: "2026-10-15",
  nutrition: null,
  workout: null,
  recovery: null,
};

describe("generateCoachRecommendations", () => {
  it("does not infer problems from missing domain data", () => {
    expect(generateCoachRecommendations(base)).toEqual([]);
  });

  it("prioritizes a recovery signal and asks for food-log review before adherence claims", () => {
    const result = generateCoachRecommendations({
      ...base,
      nutrition: {
        calories: 1000,
        calorieTarget: 2200,
        proteinG: 30,
        proteinTargetG: 130,
        explicitlyMarkedComplete: false,
      },
      recovery: { sleepHours: 5.5, energy: 2 },
    });

    expect(result.map((item) => item.type)).toEqual([
      "recovery_check_in",
      "review_food_log",
    ]);
    expect(result[0].evidence).toHaveLength(1);
    expect(result[0].ruleVersion).toBe("1");
  });

  it("does not suggest protein changes from an incomplete food log", () => {
    const result = generateCoachRecommendations({
      ...base,
      nutrition: {
        calories: 900,
        calorieTarget: 2200,
        proteinG: 25,
        proteinTargetG: 120,
        explicitlyMarkedComplete: false,
      },
    });

    expect(result.map((item) => item.type)).toEqual(["review_food_log"]);
  });

  it("uses only completed intake to create protein support recommendations", () => {
    const result = generateCoachRecommendations({
      ...base,
      nutrition: {
        calories: 1800,
        calorieTarget: 2200,
        proteinG: 40,
        proteinTargetG: 120,
        explicitlyMarkedComplete: true,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("protein_support");
    expect(result[0].evidence[0].summary).toContain("40 g");
  });

  it("does not label a workout missed if it was completed", () => {
    const result = generateCoachRecommendations({
      ...base,
      workout: { plannedToday: true, completedToday: true },
    });

    expect(result).toEqual([]);
  });

  it("returns a stable, bounded list with deterministic ordering", () => {
    const snapshot: CoachStateSnapshot = {
      ...base,
      nutrition: {
        calories: 1000,
        calorieTarget: 2200,
        proteinG: 20,
        proteinTargetG: 130,
        explicitlyMarkedComplete: false,
      },
      workout: { plannedToday: true, completedToday: false },
      recovery: { stress: 5, soreness: 5 },
    };
    const first = generateCoachRecommendations(snapshot);
    const second = generateCoachRecommendations(snapshot);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first[0].type).toBe("recovery_check_in");
  });
});
