import { getInvalidatedProjectionKeys } from "./domain-events";

describe("domain event invalidation policy", () => {
  it("invalidates nutrition totals, completeness, Coach and sync on food changes", () => {
    expect(getInvalidatedProjectionKeys("nutrition.food.updated")).toEqual([
      "nutrition.daily-summary", "nutrition.completeness", "nutrition.history", "coach.recommendations", "sync.food-logs",
    ]);
  });

  it("invalidates session metrics, PRs, Coach and sync after a set correction", () => {
    const keys = getInvalidatedProjectionKeys("workout.set.updated");
    expect(keys).toContain("workout.session-summary");
    expect(keys).toContain("workout.personal-records");
    expect(keys).toContain("coach.recommendations");
    expect(keys).toContain("sync.workouts");
  });

  it("returns a defensive copy so consumers cannot mutate the policy", () => {
    const keys = getInvalidatedProjectionKeys("recovery.check-in.saved");
    keys.pop();
    expect(getInvalidatedProjectionKeys("recovery.check-in.saved")).toContain("coach.recommendations");
  });
});
