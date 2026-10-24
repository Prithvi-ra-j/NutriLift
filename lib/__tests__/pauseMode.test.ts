jest.mock("../data/appSettings", () => ({
  getAppSetting: jest.fn(),
  setAppSettings: jest.fn(),
}));

import { getAppSetting, setAppSettings } from "../data/appSettings";
import {
  isTrackingPausedOnDate,
  pauseTracking,
  resumeTracking,
  getTrackingPauseStatus,
} from "../pauseMode";

describe("tracking pause", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks dates in the configured pause interval as skipped", () => {
    expect(isTrackingPausedOnDate(
      "2026-10-27",
      "2026-10-24",
      "2026-10-30",
    )).toBe(true);
  });

  it("does not pause dates outside the interval or with missing settings", () => {
    expect(isTrackingPausedOnDate(
      "2026-10-23",
      "2026-10-24",
      "2026-10-30",
    )).toBe(false);
    expect(isTrackingPausedOnDate(
      "2026-10-31",
      "2026-10-24",
      "2026-10-30",
    )).toBe(false);
    expect(isTrackingPausedOnDate("2026-10-27", null, null)).toBe(false);
    expect(isTrackingPausedOnDate(
      "2026-02-30",
      "2026-02-24",
      "2026-03-02",
    )).toBe(false);
  });

  it("stores validated pause intervals", async () => {
    await pauseTracking("2026-10-24", "2026-10-30");

    expect(setAppSettings).toHaveBeenCalledWith({
      pause_from: "2026-10-24",
      pause_until: "2026-10-30",
    });
    await expect(pauseTracking("2026-10-31", "2026-10-30"))
      .rejects.toThrow(RangeError);
    expect(setAppSettings).toHaveBeenCalledTimes(1);
  });

  it("resumes by ending the pause on the previous date", async () => {
    await resumeTracking("2026-10-27");

    expect(setAppSettings).toHaveBeenCalledWith({
      pause_until: "2026-10-26",
    });
    await expect(resumeTracking("2026-02-30")).rejects.toThrow(RangeError);
    expect(setAppSettings).toHaveBeenCalledTimes(1);
  });

  it("returns validated pause settings and status", async () => {
    jest.mocked(getAppSetting)
      .mockResolvedValueOnce("2026-10-24")
      .mockResolvedValueOnce("2026-10-30");

    await expect(getTrackingPauseStatus("2026-10-27")).resolves.toEqual({
      paused: true,
      from: "2026-10-24",
      until: "2026-10-30",
    });

    jest.mocked(getAppSetting)
      .mockResolvedValueOnce("invalid")
      .mockResolvedValueOnce(null);
    await expect(getTrackingPauseStatus("2026-10-27")).resolves.toEqual({
      paused: false,
      from: null,
      until: null,
    });
  });
});
