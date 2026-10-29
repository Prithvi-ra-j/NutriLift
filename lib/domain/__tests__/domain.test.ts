import { e1rm } from "../e1rm";
import { derivePRs } from "../prs";
import { calculateVolume } from "../volume";
import { shouldIncreaseLoad } from "../progression";
import {
  adherenceScore,
  createManualFoodDraft,
  isValidFoodLog,
  mealForHour,
  sumFoodLogs,
} from "../nutrition";
import { num } from "../barcode";

describe("strength domain", () => {
  it("caps Epley repetitions at 12 and treats singles as their lifted weight", () => {
    expect(e1rm(80, 1)).toBe(80);
    expect(e1rm(75, 20)).toBe(105);
    expect(e1rm(75, 12)).toBe(105);
    expect(() => e1rm(-1, 5)).toThrow(RangeError);
    expect(() => e1rm(50, 0)).toThrow(RangeError);
  });

  it("derives PRs in chronological order and promotes the previous best", () => {
    const sets = [
      { setId: "later", exerciseName: "Squat", weightKg: 80, reps: 1, date: "2026-01-02", loggedAt: 2, isWarmup: false },
      { setId: "earlier", exerciseName: "Squat", weightKg: 75, reps: 20, date: "2026-01-01", loggedAt: 1, isWarmup: false },
      { setId: "warmup", exerciseName: "Squat", weightKg: 200, reps: 1, date: "2026-01-03", loggedAt: 3, isWarmup: true },
    ];

    const complete = derivePRs(sets);
    expect(complete.prSetIds).toEqual(new Set(["earlier"]));
    expect(complete.bestByExercise.get("Squat")?.setId).toBe("earlier");
    expect(derivePRs(sets.filter((set) => set.setId !== "earlier")).prSetIds).toEqual(
      new Set(["later"]),
    );
  });

  it("does not mark equal e1RM sets on the same day as another PR", () => {
    const result = derivePRs([
      { setId: "one", exerciseName: "Bench", weightKg: 60, reps: 10, date: "2026-01-01", loggedAt: 1, isWarmup: false },
      { setId: "two", exerciseName: "Bench", weightKg: 60, reps: 10, date: "2026-01-01", loggedAt: 2, isWarmup: false },
    ]);
    expect(result.prSetIds).toEqual(new Set(["one"]));
  });

  it("marks a later strict e1RM improvement as a new PR", () => {
    const result = derivePRs([
      { setId: "first", exerciseName: "Press", weightKg: 50, reps: 10, date: "2026-01-01", loggedAt: 1, isWarmup: false },
      { setId: "improvement", exerciseName: "Press", weightKg: 60, reps: 10, date: "2026-01-02", loggedAt: 2, isWarmup: false },
    ]);
    expect(result.prSetIds).toEqual(new Set(["first", "improvement"]));
    expect(result.bestByExercise.get("Press")?.setId).toBe("improvement");
  });

  it("uses set ID as a deterministic tie-breaker", () => {
    const result = derivePRs([
      { setId: "b", exerciseName: "Press", weightKg: 50, reps: 10, date: "2026-01-01", loggedAt: 1, isWarmup: false },
      { setId: "a", exerciseName: "Press", weightKg: 50, reps: 10, date: "2026-01-01", loggedAt: 1, isWarmup: false },
    ]);
    expect(result.bestByExercise.get("Press")?.setId).toBe("a");
    expect(result.prSetIds).toEqual(new Set(["a"]));
  });

  it("ignores warmups and invalid strength values when deriving PRs", () => {
    const result = derivePRs([
      { setId: "warmup", exerciseName: "Squat", weightKg: 200, reps: 1, date: "2026-01-01", loggedAt: 1, isWarmup: true },
      { setId: "bad-reps", exerciseName: "Squat", weightKg: 200, reps: 0, date: "2026-01-01", loggedAt: 2, isWarmup: false },
      { setId: "fractional-reps", exerciseName: "Squat", weightKg: 200, reps: 1.5, date: "2026-01-01", loggedAt: 3, isWarmup: false },
      { setId: "bad-weight", exerciseName: "Squat", weightKg: Number.NaN, reps: 10, date: "2026-01-01", loggedAt: 4, isWarmup: false },
      { setId: "negative-weight", exerciseName: "Squat", weightKg: -1, reps: 10, date: "2026-01-01", loggedAt: 5, isWarmup: false },
    ]);
    expect(result.prSetIds.size).toBe(0);
    expect(result.bestByExercise.size).toBe(0);
  });

  it("calculates working volume only for strength exercise types", () => {
    const sets = [
      { weightKg: 20, reps: 10, isWarmup: false, exerciseType: "weight_reps" },
      { weightKg: 0, reps: 10, isWarmup: false, exerciseType: "bodyweight_reps" },
      { weightKg: 20, reps: 10, isWarmup: true, exerciseType: "weight_reps" },
      { weightKg: 20, reps: 10, isWarmup: false, exerciseType: "duration" },
    ];
    expect(calculateVolume(sets)).toBe(200);

    const shuffled = [...sets].reverse();
    expect(calculateVolume(shuffled)).toBe(calculateVolume(sets));
    expect(calculateVolume([
      { weightKg: 10, reps: 10, isWarmup: false, exerciseType: null },
    ])).toBe(100);
    expect(calculateVolume([
      { weightKg: Number.NaN, reps: 10, isWarmup: false, exerciseType: "weight_reps" },
      { weightKg: 10, reps: Number.NaN, isWarmup: false, exerciseType: "weight_reps" },
      { weightKg: 20, reps: 10, isWarmup: false, exerciseType: "reps_only" },
    ])).toBe(0);
  });

  it("keeps volume invariant across every insertion order", () => {
    const sets = [
      { weightKg: 22.5, reps: 8, isWarmup: false, exerciseType: "weight_reps" },
      { weightKg: 0, reps: 12, isWarmup: false, exerciseType: "bodyweight_reps" },
      { weightKg: 80, reps: 3, isWarmup: true, exerciseType: "weight_reps" },
      { weightKg: 35, reps: 10, isWarmup: false, exerciseType: "duration" },
    ];
    const expected = calculateVolume(sets);

    const visitPermutations = (remaining: typeof sets, ordered: typeof sets = []) => {
      if (remaining.length === 0) {
        expect(calculateVolume(ordered)).toBe(expected);
        return;
      }
      remaining.forEach((set, index) => {
        visitPermutations(
          [...remaining.slice(0, index), ...remaining.slice(index + 1)],
          [...ordered, set],
        );
      });
    };

    visitPermutations(sets);
  });

  it("checks progression across distinct dates and requires consistent weights", () => {
    const ready = ["2026-01-05", "2026-01-03"].map((date, index) => ({
      sessionId: `session-${index}`,
      date,
      sets: [1, 2, 3].map(() => ({ weightKg: 50, reps: 12, isWarmup: false })),
    }));
    const firstReady = ready.at(0);
    const secondReady = ready.at(1);
    if (!firstReady || !secondReady) throw new Error("Expected two progression sessions.");
    expect(shouldIncreaseLoad(ready, [8, 12], 3)).toBe(true);
    expect(
      shouldIncreaseLoad(
        [{ ...firstReady, date: "2026-01-05" }, { ...secondReady, date: "2026-01-05" }],
        [8, 12],
        3,
      ),
    ).toBe(false);
    expect(
      shouldIncreaseLoad(
        [{
          ...firstReady,
          sets: [{ weightKg: 45, reps: 12, isWarmup: false }, ...firstReady.sets.slice(1)],
        }, secondReady],
        [8, 12],
        3,
      ),
    ).toBe(false);
    expect(
      shouldIncreaseLoad(
        ready.map((session) => ({
          ...session,
          sets: session.sets.slice(0, 2),
        })),
        [8, 12],
        3,
      ),
    ).toBe(false);
    expect(() => shouldIncreaseLoad(ready, [12, 8], 3)).toThrow(RangeError);
  });
});

describe("nutrition domain", () => {
  it("chooses a meal by local hour and rejects invalid hours", () => {
    expect([4, 5, 10, 11, 14, 15, 17, 18, 23].map(mealForHour)).toEqual([
      "dinner",
      "breakfast",
      "breakfast",
      "lunch",
      "lunch",
      "snack",
      "snack",
      "dinner",
      "dinner",
    ]);
    expect(() => mealForHour(24)).toThrow(RangeError);
  });

  it("sums food logs and withholds score for fewer than two foods", () => {
    const logs = [
      { calories: 500, protein_g: 25, carbs_g: 50, fat_g: 15 },
      { calories: 500, protein_g: 25, carbs_g: 50, fat_g: 15 },
    ];
    expect(sumFoodLogs(logs)).toEqual({
      calories: 1000,
      protein_g: 50,
      carbs_g: 100,
      fat_g: 30,
    });
    const firstLog = logs.at(0);
    if (!firstLog) throw new Error("Expected a food log.");
    expect(adherenceScore(firstLog, { calories: 1000, protein_g: 50 }, 1)).toBeNull();
    expect(adherenceScore(sumFoodLogs(logs), { calories: 1000, protein_g: 50 }, 2)).toBe(100);
    expect(adherenceScore({ calories: 2000, protein_g: 75 }, { calories: 1000, protein_g: 50 }, 2)).toBe(40);
    expect(() => adherenceScore(sumFoodLogs(logs), { calories: 0, protein_g: 50 }, 2)).toThrow(RangeError);
  });

  it("rejects empty or zero-calorie entries while allowing zero macros", () => {
    const validEntry = {
      name: "Plain water",
      calories: 1,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };
    expect(isValidFoodLog({ ...validEntry, calories: 0 })).toBe(false);
    expect(isValidFoodLog({ ...validEntry, calories: Number.NaN })).toBe(false);
    expect(isValidFoodLog({ ...validEntry, protein_g: Number.NaN })).toBe(false);
    expect(isValidFoodLog({ ...validEntry, name: "  " })).toBe(false);
    expect(isValidFoodLog(validEntry)).toBe(true);
  });

  it("keeps a manual draft invalid until the user enters calories", () => {
    const draft = createManualFoodDraft("Typed food");
    expect(draft.name).toBe("Typed food");
    expect(Number.isNaN(draft.calories)).toBe(true);
    expect(isValidFoodLog(draft)).toBe(false);
    expect(isValidFoodLog({ ...draft, calories: 120, protein_g: 0, carbs_g: 0, fat_g: 0 })).toBe(true);
  });
});

describe("barcode domain", () => {
  it("keeps numeric zero and rejects invalid values", () => {
    expect(num("0")).toBe(0);
    expect(num(0)).toBe(0);
    expect(num("invalid")).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(Number.POSITIVE_INFINITY)).toBeNull();
    expect(num({ value: 0 })).toBeNull();
  });
});
