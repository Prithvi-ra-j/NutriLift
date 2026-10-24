import { getAppSetting, setAppSettings } from "./data/appSettings";
import { addDays, isLocalDateString } from "./time/localDate";

const PAUSE_START_KEY = "pause_from";
const PAUSE_UNTIL_KEY = "pause_until";

export function isTrackingPausedOnDate(
  date: string,
  pauseFrom: string | null,
  pauseUntil: string | null,
): boolean {
  if (
    !isLocalDateString(date) ||
    !isLocalDateString(pauseFrom) ||
    !isLocalDateString(pauseUntil)
  ) {
    return false;
  }
  return date >= pauseFrom && date <= pauseUntil;
}

export async function getTrackingPauseStatus(date: string): Promise<{
  paused: boolean;
  from: string | null;
  until: string | null;
}> {
  const [pauseFrom, pauseUntil] = await Promise.all([
    getAppSetting(PAUSE_START_KEY),
    getAppSetting(PAUSE_UNTIL_KEY),
  ]);
  return {
    paused: isTrackingPausedOnDate(date, pauseFrom, pauseUntil),
    from: pauseFrom && isLocalDateString(pauseFrom) ? pauseFrom : null,
    until: pauseUntil && isLocalDateString(pauseUntil) ? pauseUntil : null,
  };
}

export async function pauseTracking(from: string, until: string): Promise<void> {
  if (
    !isLocalDateString(from) ||
    !isLocalDateString(until) ||
    until < from
  ) {
    throw new RangeError("Tracking pause dates must be valid and ordered.");
  }
  await setAppSettings({
    [PAUSE_START_KEY]: from,
    [PAUSE_UNTIL_KEY]: until,
  });
}

export async function resumeTracking(resumedOn: string): Promise<void> {
  if (!isLocalDateString(resumedOn)) {
    throw new RangeError("Tracking resume date must be valid.");
  }
  await setAppSettings({
    [PAUSE_UNTIL_KEY]: addDays(resumedOn, -1),
  });
}
