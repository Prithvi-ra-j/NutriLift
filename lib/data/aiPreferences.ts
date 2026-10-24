import { getAppSetting, setAppSetting } from "./appSettings";

export type AiPreferenceKey =
  | "ai_consent_v1"
  | "ai_include_body_measurements"
  | "ai_include_injuries_notes"
  | "ai_min_calorie_floor";

export async function getAiPreference(key: AiPreferenceKey): Promise<string | null> {
  return getAppSetting(key);
}

export async function setAiPreference(key: AiPreferenceKey, value: string): Promise<void> {
  return setAppSetting(key, value);
}
