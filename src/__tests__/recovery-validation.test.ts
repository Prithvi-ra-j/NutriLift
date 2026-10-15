import { validateRecoveryInput } from "../../lib/recovery/validation";

describe("recovery check-in validation", () => {
  const valid = { date: "2026-10-15", sleep_duration_hr: 7.5, sleep_quality: 4, energy_level: 3, muscle_soreness: 2, stress_level: 2 };

  it("accepts a valid manual recovery check-in", () => {
    expect(() => validateRecoveryInput(valid)).not.toThrow();
  });

  it("rejects impossible dates and invalid clock times", () => {
    expect(() => validateRecoveryInput({ ...valid, date: "2026-02-31" })).toThrow("real calendar date");
    expect(() => validateRecoveryInput({ ...valid, bedtime: "24:10" })).toThrow("HH:MM");
  });

  it("does not silently clamp out-of-range subjective ratings", () => {
    expect(() => validateRecoveryInput({ ...valid, energy_level: 6 })).toThrow("Energy level");
    expect(() => validateRecoveryInput({ ...valid, sleep_quality: 3.5 })).toThrow("whole numbers");
  });

  it("accepts missing signals rather than inventing them", () => {
    expect(() => validateRecoveryInput({ date: "2026-10-15", notes: "No sleep estimate today" })).not.toThrow();
  });

  it("limits free-text notes", () => {
    expect(() => validateRecoveryInput({ ...valid, notes: "x".repeat(2001) })).toThrow("2000 characters");
  });
});
