jest.mock("../data/appSettings", () => ({
  getAppSetting: jest.fn(),
  setAppSetting: jest.fn(),
}));

import { getAppSetting, setAppSetting } from "../data/appSettings";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  setFeatureEnabled,
} from "../featureFlags";

const mockGetAppSetting = jest.mocked(getAppSetting);
const mockSetAppSetting = jest.mocked(setAppSetting);

describe("feature flags", () => {
  beforeEach(() => {
    mockGetAppSetting.mockReset().mockResolvedValue(null);
    mockSetAppSetting.mockReset().mockResolvedValue(undefined);
  });

  it("defaults quarterly, yearly, and transformation summaries off", async () => {
    await expect(isFeatureEnabled("quarterlySummaries")).resolves.toBe(false);
    await expect(isFeatureEnabled("yearlySummaries")).resolves.toBe(false);
    await expect(isFeatureEnabled("transformationStory")).resolves.toBe(false);
  });

  it("defaults weekly, monthly, and PDF features on", () => {
    expect(FEATURE_FLAG_DEFAULTS).toMatchObject({
      weeklySummaries: true,
      monthlySummaries: true,
      pdfExport: true,
    });
  });

  it("reads an explicitly saved flag value", async () => {
    mockGetAppSetting.mockResolvedValue("true");
    await expect(isFeatureEnabled("quarterlySummaries")).resolves.toBe(true);
    expect(mockGetAppSetting).toHaveBeenCalledWith("feature_quarterlySummaries");
  });

  it("rejects malformed saved values instead of silently enabling a feature", async () => {
    mockGetAppSetting.mockResolvedValue("sometimes");
    await expect(isFeatureEnabled("yearlySummaries")).rejects.toThrow(
      'Invalid saved value for feature flag "yearlySummaries".',
    );
  });

  it("persists explicit feature-flag overrides", async () => {
    await setFeatureEnabled("quarterlySummaries", true);
    expect(mockSetAppSetting).toHaveBeenCalledWith(
      "feature_quarterlySummaries",
      "true",
    );
  });
});
