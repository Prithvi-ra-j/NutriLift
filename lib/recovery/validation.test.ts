import { validateRecoveryInput } from "./validation";

const valid = {
  date: "2026-10-15",
  sleep_duration_hr: 7.5,
  sleep_quality: 4,
  bedtime: "22:30",
  wake_time: "06:00",
  hrv: 55,
  resting_hr: 58,
  energy_level: 4,
  muscle_soreness: 2,
  stress_level: 2,
  notes: "Normal training day",
};

describe("validateRecoveryInput", () => {
  it("accepts a complete manual check-in", () => {
    expect(() => validateRecoveryInput(valid)).not.toThrow();
  });

  it("accepts partial check-ins because each signal is independently optional", () => {
    expect(() => validateRecoveryInput({ date: "2026-10-15", energy_level: 3 })).not.toThrow();
  });

  it.each([
    ["impossible date", { date: "2026-02-30" }],
    ["negative sleep", { sleep_duration_hr: -1 }],
    ["too much sleep", { sleep_duration_hr: 25 }],
    ["fractional quality", { sleep_quality: 3.5 }],
    ["invalid HRV", { hrv: 0 }],
    ["invalid resting heart rate", { resting_hr: 10 }],
    ["invalid energy", { energy_level: 6 }],
    ["invalid soreness", { muscle_soreness: 0 }],
    ["invalid stress", { stress_level: 5.5 }],
    ["invalid bedtime", { bedtime: "25:10" }],
    ["oversized notes", { notes: "x".repeat(2001) }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateRecoveryInput({ ...valid, ...overrides })).toThrow();
  });
});
