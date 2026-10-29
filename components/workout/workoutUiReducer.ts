import { useReducer } from "react";
import type { SetStateAction } from "react";
import type { DayType, ExerciseType } from "../../lib/constants/exercises";
import type { CustomExercise } from "../../lib/data/types";
import { dayOfWeek } from "../../lib/time/localDate";

export interface WorkoutUiState {
  selectedDayType: DayType;
  showAddExercise: boolean;
  showTemplateSelector: boolean;
  selectedTemplateExercises: Set<string>;
  exerciseSearch: string;
  progressionAlerts: Record<string, string>;
  completedDayTypes: Set<string>;
  swapExerciseId: string | null;
  swapSearch: string;
  customExercises: CustomExercise[];
  showCreateCustom: boolean;
  customExName: string;
  customExType: ExerciseType;
  customExMuscle: string;
  customExEquip: string;
  editingExerciseId: string | null;
  editExerciseName: string;
  editExerciseMuscle: string;
  editExerciseEquip: string;
}

type WorkoutUiAction = {
  [K in keyof WorkoutUiState]: {
    type: "set";
    field: K;
    value: SetStateAction<WorkoutUiState[K]>;
  };
}[keyof WorkoutUiState];

export function defaultDayType(date: string): DayType {
  const weekday = dayOfWeek(date);
  if (weekday === 0) return "Cardio";
  const map: Record<number, DayType> = {
    1: "Push A",
    2: "Pull A",
    3: "Legs A",
    4: "Push B",
    5: "Pull B",
    6: "Legs B",
  };
  return map[weekday] ?? "Push A";
}

function createInitialState(date: string): WorkoutUiState {
  return {
    selectedDayType: defaultDayType(date),
    showAddExercise: false,
    showTemplateSelector: false,
    selectedTemplateExercises: new Set(),
    exerciseSearch: "",
    progressionAlerts: {},
    completedDayTypes: new Set(),
    swapExerciseId: null,
    swapSearch: "",
    customExercises: [],
    showCreateCustom: false,
    customExName: "",
    customExType: "weight_reps",
    customExMuscle: "chest",
    customExEquip: "dumbbell",
    editingExerciseId: null,
    editExerciseName: "",
    editExerciseMuscle: "",
    editExerciseEquip: "",
  };
}

function reducer(state: WorkoutUiState, action: WorkoutUiAction): WorkoutUiState {
  const current = state[action.field] as never;
  const nextValue =
    typeof action.value === "function"
      ? (action.value as unknown as (previous: never) => never)(current)
      : action.value;
  return { ...state, [action.field]: nextValue };
}

export function useWorkoutUiReducer(date: string) {
  const [state, dispatch] = useReducer(reducer, date, createInitialState);
  const setField = <K extends keyof WorkoutUiState>(
    field: K,
    value: SetStateAction<WorkoutUiState[K]>,
  ) => dispatch({ type: "set", field, value } as WorkoutUiAction);
  return { state, setField };
}
