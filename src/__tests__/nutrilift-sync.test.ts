import {
  SUPPORTED_RECORD_TYPES,
  validateSyncRecord,
  buildDeterministicFactId,
} from "../../lib/integrations/life-os/exportSchema";

describe("NutriLift sync contract", () => {
  it("supports the expected record types", () => {
    expect(SUPPORTED_RECORD_TYPES).toContain("body.training.session");
    expect(SUPPORTED_RECORD_TYPES).toContain("body.measurement");
    expect(SUPPORTED_RECORD_TYPES).toContain("body.nutrition.adherence");
  });

  it("accepts a valid NutriLift sync payload", () => {
    const record = {
      schemaVersion: 1,
      sourceApp: "nutrilift" as const,
      externalId: "nutrilift:workout_session:123",
      recordType: "body.training.session",
      occurredAt: "2026-09-20T18:30:00Z",
      sourceUpdatedAt: "2026-09-20T19:00:00Z",
      payload: { durationMin: 52, totalVolumeKg: 3200 },
      deleted: false,
      userId: "user-123",
    };

    expect(validateSyncRecord(record)).toEqual({ valid: true });
  });

  it("rejects unsupported schema versions and unknown record types", () => {
    expect(
      validateSyncRecord({
        schemaVersion: 2,
        sourceApp: "nutrilift",
        externalId: "nutrilift:workout_session:123",
        recordType: "body.training.session",
        occurredAt: "2026-09-20T18:30:00Z",
        payload: {},
        deleted: false,
        userId: "user-123",
      })
    ).toEqual({ valid: false, errors: expect.arrayContaining(["Unsupported schemaVersion"])});

    expect(
      validateSyncRecord({
        schemaVersion: 1,
        sourceApp: "nutrilift",
        externalId: "nutrilift:workout_session:123",
        recordType: "body.unknown",
        occurredAt: "2026-09-20T18:30:00Z",
        payload: {},
        deleted: false,
        userId: "user-123",
      })
    ).toEqual({ valid: false, errors: expect.arrayContaining(["Unknown recordType"]) });
  });

  it("builds deterministic fact ids for repeated imports", () => {
    expect(
      buildDeterministicFactId("body.training.session", "nutrilift:workout_session:123")
    ).toBe("fact:nutrilift:body.training.session:nutrilift:workout_session:123");
  });
});
