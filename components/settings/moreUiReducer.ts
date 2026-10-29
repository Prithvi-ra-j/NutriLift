import { useReducer } from "react";
import type { SetStateAction } from "react";
import type { Feather } from "@expo/vector-icons";
import type { MonthlyReport, SupplementLog } from "../../lib/data/types";
import { getProfile, getTargetsForDate } from "../../lib/data/profile";
import type { RestoreAvailability } from "./types";

export type MoreSection =
  | "menu"
  | "body"
  | "supplements"
  | "recovery"
  | "reports"
  | "account"
  | "settings";
export type MoreSectionIcon = React.ComponentProps<typeof Feather>["name"];

export interface MoreUiState {
  activeSection: MoreSection;
  weightInput: string;
  latestWeight: number | null;
  supplementLogs: SupplementLog[];
  sleepHr: string;
  sleepQuality: number;
  energyLevel: number;
  soreness: number;
  stressLevel: number;
  recoveryNotes: string;
  recoverySaved: boolean;
  reports: MonthlyReport[];
  profile: Awaited<ReturnType<typeof getProfile>>;
  targets: Awaited<ReturnType<typeof getTargetsForDate>> | null;
  isSyncing: boolean;
  syncStatus: string;
  email: string;
  password: string;
  signedInEmail: string | null;
  restoreAvailability: RestoreAvailability;
  restoreAvailabilityError: string | null;
  authChecked: boolean;
  authError: string | null;
  loadError: string | null;
  isAuthenticating: boolean;
  aiConsent: boolean;
  includeBodyMeasurements: boolean;
  includeInjuriesAndNotes: boolean;
  minimumCalorieFloor: string;
  isExportingFixture: boolean;
  trackingPause: { paused: boolean; until: string | null };
}

type MoreUiAction = {
  [K in keyof MoreUiState]: {
    type: "set";
    field: K;
    value: SetStateAction<MoreUiState[K]>;
  };
}[keyof MoreUiState];

const initialState: MoreUiState = {
  activeSection: "menu",
  weightInput: "",
  latestWeight: null,
  supplementLogs: [],
  sleepHr: "7",
  sleepQuality: 3,
  energyLevel: 3,
  soreness: 3,
  stressLevel: 3,
  recoveryNotes: "",
  recoverySaved: false,
  reports: [],
  profile: null,
  targets: null,
  isSyncing: false,
  syncStatus: "Not synced yet",
  email: "",
  password: "",
  signedInEmail: null,
  restoreAvailability: "unavailable",
  restoreAvailabilityError: null,
  authChecked: false,
  authError: null,
  loadError: null,
  isAuthenticating: false,
  aiConsent: false,
  includeBodyMeasurements: false,
  includeInjuriesAndNotes: false,
  minimumCalorieFloor: "1500",
  isExportingFixture: false,
  trackingPause: { paused: false, until: null },
};

function reducer(state: MoreUiState, action: MoreUiAction): MoreUiState {
  const current = state[action.field] as never;
  const next =
    typeof action.value === "function"
      ? (action.value as unknown as (previous: never) => never)(current)
      : action.value;
  return { ...state, [action.field]: next };
}

export function useMoreUiReducer() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setField = <K extends keyof MoreUiState>(
    field: K,
    value: SetStateAction<MoreUiState[K]>,
  ) => dispatch({ type: "set", field, value } as MoreUiAction);
  return { state, setField };
}
