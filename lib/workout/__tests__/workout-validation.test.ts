import { assertWorkoutStatusTransition, validateWorkoutSetInput, type WorkoutSetInput } from "../workout-validation";

const validSet: WorkoutSetInput = {
  id: "set-1",
  exercise_log_id: "exercise-1",
  set_number: 1,
  weight_kg: 40,
  reps: 10,
  duration_sec: null,
  distance_km: null,
  rpe: 8,
  is_pr: 0,
  is_warmup: 0,
};

describe("workout domain validation", () => {
  it("accepts a valid logged set including bodyweight sets", () => {
    expect(() => validateWorkoutSetInput(validSet)).not.toThrow();
    expect(() => validateWorkoutSetInput({ ...validSet, weight_kg: 0 })).not.toThrow();
  });

  it.each([
    ["missing set id", { id: "" }],
    ["missing exercise id", { exercise_log_id: "" }],
    ["invalid set number", { set_number: 0 }],
    ["negative weight", { weight_kg: -1 }],
    ["non-finite weight", { weight_kg: Number.NaN }],
    ["fractional reps", { reps: 3.5 }],
    ["zero reps", { reps: 0 }],
    ["invalid duration", { duration_sec: 0 }],
    ["invalid distance", { distance_km: Number.POSITIVE_INFINITY }],
    ["invalid RPE", { rpe: 11 }],
    ["invalid boolean flag", { is_warmup: 2 }],
  ])("rejects %s", (_label, override) => {
    expect(() => validateWorkoutSetInput({ ...validSet, ...override } as WorkoutSetInput)).toThrow();
  });

  it("allows only explicit forward session transitions", () => {
    expect(() => assertWorkoutStatusTransition("planned", "in_progress")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("in_progress", "completed")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("in_progress", "cancelled")).not.toThrow();
    expect(() => assertWorkoutStatusTransition("completed", "in_progress")).toThrow(/Cannot change/);
    expect(() => assertWorkoutStatusTransition("cancelled", "completed")).toThrow(/Cannot change/);
  });
});
