const mockGetDailyNutritionRange = jest.fn();
const mockGetSessionsForDateRange = jest.fn();
const mockGetAllPRs = jest.fn();
const mockGetBodyStatsForDateRange = jest.fn();
const mockGetRecoveryLogsForDateRange = jest.fn();
const mockGetProfile = jest.fn();
const mockGetTargetsForDate = jest.fn();
const mockGetAiContextPreferences = jest.fn();
const mockGetMinimumCalorieFloor = jest.fn();
const mockGetTrackingPauseStatus = jest.fn();
const mockGetEligibleBodyCompTimeOfDay = jest.fn();

jest.mock("../../data/repositories/nutrition", () => ({
  getDailyNutritionRange: (...args: unknown[]) => mockGetDailyNutritionRange(...args),
}));
jest.mock("../../data/repositories/workout", () => ({
  getSessionsForDateRange: (...args: unknown[]) => mockGetSessionsForDateRange(...args),
  getAllPRs: (...args: unknown[]) => mockGetAllPRs(...args),
}));
jest.mock("../../data/repositories/body", () => ({
  getBodyStatsForDateRange: (...args: unknown[]) => mockGetBodyStatsForDateRange(...args),
}));
jest.mock("../../data/repositories/recovery", () => ({
  getRecoveryLogsForDateRange: (...args: unknown[]) => mockGetRecoveryLogsForDateRange(...args),
}));
jest.mock("../../data/profile", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  getTargetsForDate: (...args: unknown[]) => mockGetTargetsForDate(...args),
}));
jest.mock("../preferences", () => ({
  getAiContextPreferences: (...args: unknown[]) => mockGetAiContextPreferences(...args),
  getMinimumCalorieFloor: (...args: unknown[]) => mockGetMinimumCalorieFloor(...args),
}));
jest.mock("../gateway", () => ({
  AiError: class AiError extends Error {},
}));
jest.mock("../../pauseMode", () => ({
  getTrackingPauseStatus: (...args: unknown[]) => mockGetTrackingPauseStatus(...args),
}));
jest.mock("../../analytics/bodyCompSafety", () => ({
  getEligibleBodyCompTimeOfDay: (...args: unknown[]) => mockGetEligibleBodyCompTimeOfDay(...args),
}));

import { buildCoachContext } from "../context-builder";

describe("AI context privacy preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDailyNutritionRange.mockResolvedValue([]);
    mockGetSessionsForDateRange.mockResolvedValue([]);
    mockGetAllPRs.mockResolvedValue([]);
    mockGetBodyStatsForDateRange.mockResolvedValue([]);
    mockGetRecoveryLogsForDateRange.mockResolvedValue([]);
    mockGetProfile.mockResolvedValue({
      id: "me",
      display_name: null,
      sex: null,
      birth_year: null,
      height_cm: null,
      goal_text: null,
      coach_notes: "Keep responses concise.",
      updated_at: "2026-10-24T08:00:00.000Z",
    });
    mockGetTargetsForDate.mockResolvedValue({
      effective_from: "2026-10-24",
      calories: 2_200,
      protein_g: 130,
      carbs_g: 250,
      fat_g: 70,
    });
    mockGetAiContextPreferences.mockResolvedValue({
      includeBodyMeasurements: false,
      includeInjuriesAndNotes: false,
    });
    mockGetMinimumCalorieFloor.mockResolvedValue(1_500);
    mockGetTrackingPauseStatus.mockResolvedValue({ paused: false, from: null, until: null });
    mockGetEligibleBodyCompTimeOfDay.mockReturnValue("morning");
  });

  it("excludes body measurements and coach notes unless their settings are enabled", async () => {
    const privateContext = await buildCoachContext();
    expect(privateContext).not.toHaveProperty("body_measurements");
    expect(privateContext).not.toHaveProperty("coach_notes");

    mockGetAiContextPreferences.mockResolvedValue({
      includeBodyMeasurements: true,
      includeInjuriesAndNotes: true,
    });

    const optedInContext = await buildCoachContext();
    expect(optedInContext.body_measurements).toEqual({
      latest_weight_kg: null,
      weight_date: null,
      latest_body_fat_pct: null,
      body_fat_date: null,
    });
    expect(optedInContext.coach_notes).toBe("Keep responses concise.");
  });
});
