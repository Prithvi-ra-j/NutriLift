import { validateRecoveryInput, type RecoveryInput } from "../validation";

const valid: RecoveryInput = {
  date: "2026-10-15",
  sleep_duration_hr: 7.5,
  sleep_quality: 4,
  bedtime: "23:15",
  wake_time: "06:45",
  energy_level: 3,
  muscle_soreness: 2,
  stress_level: 2,
  notes: "Felt rested",
};

describe("recovery input validation", () => {
  it("accepts valid manually entered recovery data", () => {
    expect(() => validateRecoveryInput(valid)).not.toThrow();
  });

  it.each([
    ["impossible calendar date", { date: "2026-02-30" }],
    ["negative sleep duration", { sleep_duration_hr: -1 }],
    ["sleep longer than a day", { sleep_duration_hr: 25 }],
    ["invalid quality", { sleep_quality: 6 }],
    ["invalid time", { bedtime: "25:99" }],
    ["invalid energy", { energy_level: 0 }],
    ["invalid resting heart rate", { resting_hr: 0 }],
    ["oversized notes", { notes: "x".repeat(2001) }],
  ])("rejects %s", (_label, override) => {
    expect(() => validateRecoveryInput({ ...valid, ...override } as RecoveryInput)).toThrow();
  });

  it("allows an incomplete entry so users can log only what they know", () => {
    expect(() => validateRecoveryInput({ date: "2026-10-15" })).not.toThrow();
  });
});
