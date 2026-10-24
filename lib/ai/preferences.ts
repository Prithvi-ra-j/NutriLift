import {
  getAiPreference,
  setAiPreference,
} from "../data/aiPreferences";
import { MIN_CALORIE_FLOOR } from "./guardrails";

export type AiContextPreferences = {
  includeBodyMeasurements: boolean;
  includeInjuriesAndNotes: boolean;
};

export async function getAiContextPreferences(): Promise<AiContextPreferences> {
  const [body, notes] = await Promise.all([
    getAiPreference("ai_include_body_measurements"),
    getAiPreference("ai_include_injuries_notes"),
  ]);
  return {
    includeBodyMeasurements: body === "true",
    includeInjuriesAndNotes: notes === "true",
  };
}

export async function getMinimumCalorieFloor(): Promise<number> {
  const stored = await getAiPreference("ai_min_calorie_floor");
  if (stored === null) return MIN_CALORIE_FLOOR;
  const floor = Number(stored);
  if (!Number.isInteger(floor) || floor < MIN_CALORIE_FLOOR) {
    throw new RangeError("Stored minimum calorie floor is invalid.");
  }
  return floor;
}

export async function setMinimumCalorieFloor(floor: number): Promise<void> {
  if (!Number.isInteger(floor) || floor < MIN_CALORIE_FLOOR || floor > 10_000) {
    throw new RangeError(`Calorie floor must be between ${MIN_CALORIE_FLOOR} and 10000.`);
  }
  await setAiPreference("ai_min_calorie_floor", String(floor));
}

export async function setAiContextPreference(
  key: "ai_include_body_measurements" | "ai_include_injuries_notes",
  enabled: boolean,
): Promise<void> {
  await setAiPreference(key, String(enabled));
}
