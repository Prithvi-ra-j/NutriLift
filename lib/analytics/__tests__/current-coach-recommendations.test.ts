jest.mock("../../db/queries/nutrition", () => ({ getDailyNutrition: jest.fn() }));
jest.mock("../../db/queries/workout", () => ({ getSessionsForDateRange: jest.fn() }));
jest.mock("../../db/queries/recovery", () => ({ getRecoveryLog: jest.fn() }));
jest.mock("../../db/queries/nutrition-targets", () => ({ getNutritionTargetsForDate: jest.fn() }));
jest.mock("../../db/queries/recommendations", () => ({ getRecommendationOutcomesForDate: jest.fn() }));
import { buildUserStateSnapshot } from "../current-coach-recommendations";
import { evaluateNutritionAdherence, evaluateRecoveryReadiness, generateCoachRecommendations } from "../coach-recommendations";
import { DEFAULT_NUTRITION_TARGETS } from "../../nutrition/target-validation";

describe("current coach state snapshot", () => {
  it("does not infer a missed workout from absent session records", () => {
    const snapshot = buildUserStateSnapshot("2026-10-15", null, [], null, DEFAULT_NUTRITION_TARGETS);
    expect(snapshot.workout).toBeNull();
    expect(generateCoachRecommendations(snapshot).some((item) => item.type === "workout_follow_through")).toBe(false);
  });

  it("uses explicit planned/completed session states", () => {
    const snapshot = buildUserStateSnapshot("2026-10-15", null, [{ status: "planned" } as any], null, DEFAULT_NUTRITION_TARGETS);
    expect(snapshot.workout).toEqual({ plannedToday: true, completedToday: false });
    expect(generateCoachRecommendations(snapshot).some((item) => item.type === "workout_follow_through")).toBe(true);
  });

  it("requires explicit completion before interpreting low protein as a shortfall", () => {
    const nutrition = { total_calories: 900, total_protein_g: 20, is_complete: 0 } as any;
    const provisional = buildUserStateSnapshot("2026-10-15", nutrition, [], null, DEFAULT_NUTRITION_TARGETS);
    expect(generateCoachRecommendations(provisional).some((item) => item.type === "protein_support")).toBe(false);
    const reviewed = buildUserStateSnapshot("2026-10-15", { ...nutrition, is_complete: 1 }, [], null, DEFAULT_NUTRITION_TARGETS);
    expect(generateCoachRecommendations(reviewed).some((item) => item.type === "protein_support")).toBe(true);
  });

  it("distinguishes unlogged, provisional, and reviewed nutrition states", () => {
    expect(evaluateNutritionAdherence(null).status).toBe("unlogged");
    const provisional = evaluateNutritionAdherence({ calories: 1800, calorieTarget: 2200, proteinG: 70, proteinTargetG: 130, explicitlyMarkedComplete: false });
    expect(provisional.status).toBe("provisional");
    expect(provisional.proteinTargetMet).toBe(false);
    const reviewed = evaluateNutritionAdherence({ calories: 2200, calorieTarget: 2200, proteinG: 130, proteinTargetG: 130, explicitlyMarkedComplete: true });
    expect(reviewed).toMatchObject({ status: "reviewed", calorieGapKcal: 0, proteinGapG: 0, calorieTargetMet: true, proteinTargetMet: true });
  });
  it("does not invent recovery signals when no manual check-in exists", () => {
    expect(evaluateRecoveryReadiness(null)).toEqual({ needsRecoveryFocus: false, signals: [] });
    expect(evaluateRecoveryReadiness({ sleepHours: 7, energy: 4, soreness: 2, stress: 2 })).toEqual({ needsRecoveryFocus: false, signals: [] });
    expect(evaluateRecoveryReadiness({ sleepHours: null, energy: 2, soreness: null, stress: 4 })).toEqual({ needsRecoveryFocus: true, signals: ["low self-reported energy", "high self-reported stress"] });
  });
});
