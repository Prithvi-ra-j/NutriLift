jest.mock("../../../db/client", () => ({ db: {} }));

import { getSourceDeepLink, parseNutriLiftExternalId } from "../sourceResolver";

describe("Life OS source resolution", () => {
  it("parses supported stable NutriLift external identifiers", () => {
    expect(parseNutriLiftExternalId("nutrilift:daily_nutrition:2026-10-15")).toEqual({
      entityType: "daily_nutrition", entityId: "2026-10-15", date: "2026-10-15",
    });
    expect(parseNutriLiftExternalId("nutrilift:personal_record:Bench%20Press:2026-10-15")).toEqual({
      entityType: "personal_record", entityId: "Bench Press", date: "2026-10-15",
    });
    expect(parseNutriLiftExternalId("other-app:daily_nutrition:2026-10-15")).toBeNull();
    expect(parseNutriLiftExternalId("nutrilift:daily_nutrition:2026-02-30")).toBeNull();
  });

  it("returns links only for supported in-app destinations", () => {
    expect(getSourceDeepLink({ entityType: "daily_nutrition", entityId: "2026-10-15", date: "2026-10-15" })).toBe("/nutrition?date=2026-10-15");
    expect(getSourceDeepLink({ entityType: "recovery_metric", entityId: "2026-10-15", date: "2026-10-15", metric: "hrv" })).toBe("/more?section=recovery");
    expect(getSourceDeepLink({ entityType: "daily_nutrition", entityId: "2026-10-15" })).toBeNull();
  });
});
