import { assertWorkoutStatusTransition, validateWorkoutSetInput } from "./workout-validation";

const validSet = {
  id: "set-1",
  exercise_log_id: "exercise-1",
  set_number: 1,
  weight_kg: 40,
  reps: 8,
  duration_sec: null,
  distance_km: null,
  rpe: 7,
  is_pr: 0,
  is_warmup: 0,
};

describe("validateWorkoutSetInput", () => {
  it("accepts valid weighted sets and bodyweight-style zero-load sets", () => {
    expect(() => validateWorkoutSetInput(validSet)).not.toThrow();
    expect(() => validateWorkoutSetInput({ ...validSet, weight_kg: 0, reps: 12 })).not.toThrow();
  });

  it.each([
    ["missing ID", { id: " " }],
    ["missing exercise", { exercise_log_id: "" }],
    ["fractional set number", { set_number: 1.5 }],
    ["negative weight", { weight_kg: -1 }],
    ["non-finite weight", { weight_kg: Number.NaN }],
    ["zero reps", { reps: 0 }],
    ["fractional reps", { reps: 2.5 }],
    ["invalid duration", { duration_sec: 0 }],
    ["invalid distance", { distance_km: Number.POSITIVE_INFINITY }],
    ["invalid RPE", { rpe: 11 }],
    ["invalid warm-up flag", { is_warmup: 2 }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateWorkoutSetInput({ ...validSet, ...overrides })).toThrow();
  });
});

describe("assertWorkoutStatusTransition", () => {
  it("allows the intended planned → in-progress → completed lifecycle", () => {
    expect(() => assertWorkoutStatusTransition("planned", "in_progress")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("in_progress", "completed")).not.toThrow();
  });

  it("allows cancellation without pretending a session was completed", () => {
    expect(() => assertWorkoutStatusTransition("planned", "cancelled")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("in_progress", "cancelled")).not.toThrow();
  });

  it("allows idempotent status assignment but blocks terminal-state rewrites", () => {
    expect(() => assertWorkoutStatusTransition("completed", "completed")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("completed", "in_progress")).toThrow(/Cannot change workout session/);
    expect(() => assertWorkoutStatusTransition("cancelled", "completed")).toThrow(/Cannot change workout session/);
  });
});
