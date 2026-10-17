import { fromLocalDateKey } from "../utils/local-date";

export interface RecoveryInput {
  date: string;
  sleep_duration_hr?: number | null;
  sleep_quality?: number | null;
  bedtime?: string | null;
  wake_time?: string | null;
  hrv?: number | null;
  resting_hr?: number | null;
  energy_level?: number | null;
  muscle_soreness?: number | null;
  stress_level?: number | null;
  notes?: string | null;
}

function assertOptionalRange(value: number | null | undefined, label: string, min: number, max: number, integer = false): void {
  if (value == null) return;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(label + " must be between " + min + " and " + max + (integer ? " (whole numbers)." : "."));
  }
}

function assertClockTime(value: string | null | undefined, label: string): void {
  if (value == null || value === "") return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(label + " must use HH:MM (24-hour time).");
}

export function validateRecoveryInput(input: RecoveryInput): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Recovery date must use YYYY-MM-DD.");
  try {
    fromLocalDateKey(input.date);
  } catch {
    throw new Error("Recovery date must be a real calendar date.");
  }
  assertOptionalRange(input.sleep_duration_hr, "Sleep duration", 0, 24);
  assertOptionalRange(input.sleep_quality, "Sleep quality", 1, 5, true);
  assertOptionalRange(input.hrv, "HRV", 1, 300, true);
  assertOptionalRange(input.resting_hr, "Resting heart rate", 20, 250, true);
  assertOptionalRange(input.energy_level, "Energy level", 1, 5, true);
  assertOptionalRange(input.muscle_soreness, "Muscle soreness", 1, 5, true);
  assertOptionalRange(input.stress_level, "Stress level", 1, 5, true);
  assertClockTime(input.bedtime, "Bedtime");
  assertClockTime(input.wake_time, "Wake time");
  if (input.notes != null && input.notes.length > 2000) throw new Error("Recovery notes must be 2000 characters or fewer.");
}


export interface RecoverySummary {
  date: string;
  status: "insufficient_data" | "needs_attention" | "no_flags";
  loggedFields: number;
  totalFields: number;
  missingFields: string[];
  signals: string[];
}

/** Summarize only self-reported fields; missing inputs remain unknown, never neutral scores. */
export function summarizeRecoveryCheckIn(input: RecoveryInput | null, date: string): RecoverySummary {
  try { fromLocalDateKey(date); } catch { throw new Error("Recovery summary date must be a real YYYY-MM-DD date."); }
  const fields: Array<[string, unknown]> = [
    ["sleep duration", input?.sleep_duration_hr],
    ["sleep quality", input?.sleep_quality],
    ["bedtime", input?.bedtime],
    ["wake time", input?.wake_time],
    ["energy", input?.energy_level],
    ["muscle soreness", input?.muscle_soreness],
    ["stress", input?.stress_level],
  ];
  const logged = fields.filter(([, value]) => value != null && value !== "").map(([name]) => name);
  const missingFields = fields.filter(([, value]) => value == null || value === "").map(([name]) => name);
  const signals = [
    input?.sleep_duration_hr != null && input.sleep_duration_hr < 6 ? "sleep below 6 hours" : null,
    input?.sleep_quality != null && input.sleep_quality <= 2 ? "low self-reported sleep quality" : null,
    input?.energy_level != null && input.energy_level <= 2 ? "low self-reported energy" : null,
    input?.muscle_soreness != null && input.muscle_soreness >= 4 ? "high self-reported soreness" : null,
    input?.stress_level != null && input.stress_level >= 4 ? "high self-reported stress" : null,
  ].filter((signal): signal is string => signal !== null);
  return {
    date,
    status: logged.length < 2 ? "insufficient_data" : signals.length ? "needs_attention" : "no_flags",
    loggedFields: logged.length,
    totalFields: fields.length,
    missingFields,
    signals,
  };
}
