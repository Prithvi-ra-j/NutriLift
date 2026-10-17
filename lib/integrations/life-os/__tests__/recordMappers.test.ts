import { mapRecoveryLog, mapWorkoutSession } from "../recordMappers";

describe("Life OS record mappers", () => {
  it("exports workout lifecycle status with the session snapshot", () => {
    const record = mapWorkoutSession({ id: "session-1", date: "2026-10-15", day_type: "Push A", status: "completed", updated_at: "2026-10-15T10:00:00.000Z" } as any);
    expect(record.payload.status).toBe("completed");
  });

  it("emits stable retractions when a recovery metric has been cleared", () => {
    const records = mapRecoveryLog({ id: "recovery-1", date: "2026-10-15", updated_at: "2026-10-15T10:00:00.000Z", sleep_duration_hr: 7, hrv: null, energy_level: undefined, muscle_soreness: 3, stress_level: null } as any);
    const sleep = records.find((record) => record.externalId.endsWith(":sleep:2026-10-15"));
    const hrv = records.find((record) => record.externalId.endsWith(":hrv:2026-10-15"));
    expect(records).toHaveLength(4);
    expect(records.some((record) => record.externalId.endsWith(":energy:2026-10-15"))).toBe(false);
    expect(sleep?.deleted).toBe(false);
    expect(hrv?.deleted).toBe(true);
    expect(hrv?.payload).toEqual({});
  });
});
