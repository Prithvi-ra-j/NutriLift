import { getAppSetting, setAppSetting } from "./data/appSettings";

export const FEATURE_FLAG_DEFAULTS = {
  weeklySummaries: true,
  monthlySummaries: true,
  quarterlySummaries: false,
  yearlySummaries: false,
  transformationStory: false,
  pdfExport: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAG_DEFAULTS;

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const value = await getAppSetting(`feature_${flag}`);
  if (value === null) return FEATURE_FLAG_DEFAULTS[flag];
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Invalid saved value for feature flag "${flag}".`);
}

export async function setFeatureEnabled(
  flag: FeatureFlag,
  enabled: boolean,
): Promise<void> {
  await setAppSetting(`feature_${flag}`, String(enabled));
}
