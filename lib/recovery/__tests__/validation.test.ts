import { validateRecoveryInput, summarizeRecoveryCheckIn, type RecoveryInput } from "../validation";

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


describe("recovery summaries", () => {
  it("keeps missing recovery fields unknown rather than assigning a neutral score", () => {
    const summary = summarizeRecoveryCheckIn(null, "2026-10-16");
    expect(summary.status).toBe("insufficient_data");
    expect(summary.loggedFields).toBe(0);
    expect(summary.missingFields).toContain("sleep duration");
    expect(summary.signals).toEqual([]);
  });
  it("flags only explicitly reported recovery concerns", () => {
    const summary = summarizeRecoveryCheckIn({
      date: "2026-10-16", sleep_duration_hr: 5.5, energy_level: 2,
      muscle_soreness: null, stress_level: null,
    }, "2026-10-16");
    expect(summary.status).toBe("needs_attention");
    expect(summary.signals).toEqual(["sleep below 6 hours", "low self-reported energy"]);
    expect(summary.missingFields).toContain("muscle soreness");
  });
  it("does not label a partially logged but concerning-free check-in as complete", () => {
    const summary = summarizeRecoveryCheckIn({
      date: "2026-10-16", energy_level: 4, stress_level: 2,
    }, "2026-10-16");
    expect(summary.status).toBe("no_flags");
    expect(summary.loggedFields).toBe(2);
    expect(summary.missingFields.length).toBeGreaterThan(0);
  });
});
