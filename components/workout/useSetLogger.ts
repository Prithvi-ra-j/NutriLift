import * as Haptics from "expo-haptics";
import { useCallback, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SetStateAction } from "react";
import {
  deleteSetLog,
  restoreSetLog,
  updateSetLog,
  useLogSet,
  workoutDayQueryKey,
} from "../../lib/data";
import type { ExerciseLog, NewSetLog, SetLog } from "../../lib/data/types";
import type { ExerciseType } from "../../lib/constants/exercises";
import { nowUnix } from "../../lib/time/clock";
import { logger } from "../../lib/logger";
import uuid from "react-native-uuid";
import { useToast } from "../ui/Toast";
import { confirmDestructive } from "../ui/confirmDestructive";
import {
  blankForm,
  formFromSet,
  type SetForm,
} from "./workoutTypes";

type SetLoggerState = {
  addForm: SetForm | null;
  editId: string | null;
  editForm: SetForm | null;
};

type SetLoggerAction =
  | { type: "set-add-form"; value: SetForm | null | ((previous: SetForm | null) => SetForm | null) }
  | { type: "set-edit-id"; value: string | null }
  | { type: "set-edit-form"; value: SetForm | null | ((previous: SetForm | null) => SetForm | null) }
  | { type: "open-edit"; id: string; form: SetForm }
  | { type: "close-edit" };

function setLoggerReducer(state: SetLoggerState, action: SetLoggerAction): SetLoggerState {
  switch (action.type) {
    case "set-add-form":
      return {
        ...state,
        addForm: typeof action.value === "function" ? action.value(state.addForm) : action.value,
      };
    case "set-edit-id":
      return { ...state, editId: action.value };
    case "set-edit-form":
      return {
        ...state,
        editForm: typeof action.value === "function" ? action.value(state.editForm) : action.value,
      };
    case "open-edit":
      return { ...state, editId: action.id, editForm: action.form };
    case "close-edit":
      return { ...state, editId: null, editForm: null };
  }
}

interface UseSetLoggerOptions {
  date: string;
  setsByExercise: Record<string, SetLog[]>;
}

function validateSetMetrics(form: SetForm) {
  const { exerciseType: type, weight: weightStr, reps: repsStr, durationSec: durationStr, distanceKm: distanceStr, durationMin } = form;
  let weight = 0;
  let reps = 0;
  let durationSec: number | null = null;
  let distanceKm: number | null = null;
  const error = (message: string) => ({
    weight: 0,
    reps: 0,
    durationSec: null,
    distanceKm: null,
    error: message,
  });

  if (type === "weight_reps") {
    weight = parseFloat(weightStr);
    reps = parseInt(repsStr);
    if (isNaN(weight) || weight < 0.1 || weight > 9999.9) return error("Weight must be between 0.1 and 9999.9 kg");
    if (isNaN(reps) || reps < 1 || reps > 9999) return error("Reps must be between 1 and 9999");
  } else if (type === "bodyweight_reps") {
    weight = weightStr.trim() ? parseFloat(weightStr) : 0;
    reps = parseInt(repsStr);
    if (!Number.isFinite(weight) || weight < 0 || weight > 9999.9) return error("Added load must be between 0 and 9999.9 kg");
    if (isNaN(reps) || reps < 1 || reps > 9999) return error("Reps must be between 1 and 9999");
  } else if (type === "reps_only") {
    reps = parseInt(repsStr);
    if (isNaN(reps) || reps < 1 || reps > 9999) return error("Reps must be between 1 and 9999");
  } else if (type === "duration") {
    const seconds = parseInt(durationStr);
    if (isNaN(seconds) || seconds < 1 || seconds > 86400) return error("Duration must be between 1 and 86400 seconds");
    durationSec = seconds;
  } else if (type === "distance_duration") {
    distanceKm = parseFloat(distanceStr);
    const minutes = parseFloat(durationMin);
    if (isNaN(distanceKm) || distanceKm < 0.01 || distanceKm > 999.99) return error("Distance must be between 0.01 and 999.99 km");
    if (isNaN(minutes) || minutes * 60 < 1 || minutes * 60 > 86400) return error("Duration must be between 1 and 86400 seconds");
    durationSec = Math.round(minutes * 60);
  }
  return { weight, reps, durationSec, distanceKm, error: null };
}

function getTimingNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function reportSubmitTiming(label: string, elapsedMs: number, budgetMs: number) {
  if (!__DEV__) return;
  const result = elapsedMs <= budgetMs ? "within budget" : "over budget";
  logger.debug(
    `Workout set timing: ${label} ${elapsedMs.toFixed(1)} ms (${result}; ${budgetMs} ms budget)`,
  );
}

export function useSetLogger({ date, setsByExercise }: UseSetLoggerOptions) {
  const mutation = useLogSet(date);
  const queryClient = useQueryClient();
  const { show } = useToast();
  const pendingVisibleTimes = useRef(new Map<string, number>());
  const [state, dispatch] = useReducer(setLoggerReducer, {
    addForm: null,
    editId: null,
    editForm: null,
  });

  const setAddForm = (value: SetStateAction<SetForm | null>) => {
    dispatch({ type: "set-add-form", value });
  };
  const setEditForm = (value: SetForm | null | ((previous: SetForm | null) => SetForm | null)) => {
    dispatch({ type: "set-edit-form", value });
  };
  const setEditingSetId = (value: string | null) => {
    dispatch({ type: "set-edit-id", value });
  };

  const logSet = async () => {
    const form = state.addForm;
    if (!form) return;
    const validated = validateSetMetrics(form);
    if (validated.error) {
      show({ message: validated.error, kind: "error" });
      return;
    }

    const newSet: NewSetLog = {
      id: uuid.v4() as string,
      exercise_log_id: form.exerciseLogId,
      set_number: (setsByExercise[form.exerciseLogId] ?? []).length + 1,
      weight_kg: validated.weight,
      reps: validated.reps,
      duration_sec: validated.durationSec,
      distance_km: validated.distanceKm,
      rpe: form.rpe ? parseInt(form.rpe) : null,
      is_warmup: form.isWarmup ? 1 : 0,
      notes: null,
      logged_at: nowUnix(),
    };
    const submittedAt = getTimingNow();

    const persist = async (attemptStartedAt: number) => {
      pendingVisibleTimes.current.set(newSet.id, attemptStartedAt);
      try {
        await mutation.mutateAsync(newSet);
        reportSubmitTiming("tap-to-persisted", getTimingNow() - attemptStartedAt, 300);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          (error: unknown) => {
            logger.warn("Set saved but success haptics were unavailable", {
              error: error instanceof Error ? error.message : String(error),
            });
          },
        );
        show({ message: "Set logged.", kind: "success" });
        setAddForm((previous) =>
          previous
            ? {
                ...previous,
                reps: "",
                rpe: "",
                durationSec: "",
                distanceKm: "",
                durationMin: "",
              }
            : null,
        );
      } catch (error) {
        pendingVisibleTimes.current.delete(newSet.id);
        logger.error("Workout set submission failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        show({
          message: "Could not log set. Please try again.",
          kind: "error",
          action: { label: "Retry", onPress: () => void persist(getTimingNow()) },
        });
      }
    };
    await persist(submittedAt);
  };

  const markSetVisible = useCallback((setId: string) => {
    const submittedAt = pendingVisibleTimes.current.get(setId);
    if (submittedAt === undefined) return;
    pendingVisibleTimes.current.delete(setId);
    reportSubmitTiming("tap-to-visible", getTimingNow() - submittedAt, 100);
  }, []);

  const openEditSet = (set: SetLog, exercise: ExerciseLog) => {
    const type = (exercise.exercise_type as ExerciseType) ?? "weight_reps";
    dispatch({
      type: "open-edit",
      id: set.id,
      form: formFromSet(set, exercise.id, exercise.exercise_name, type),
    });
    if (state.addForm?.exerciseLogId === exercise.id) setAddForm(null);
  };

  const saveEditSet = async () => {
    const form = state.editForm;
    const editId = state.editId;
    if (!form || !editId) return;
    const validated = validateSetMetrics(form);
    if (validated.error) {
      show({ message: validated.error, kind: "error" });
      return;
    }

    try {
      await updateSetLog(
        editId,
        {
          weight_kg: validated.weight,
          reps: validated.reps,
          duration_sec: validated.durationSec,
          distance_km: validated.distanceKm,
          rpe: form.rpe ? parseInt(form.rpe) : null,
          is_warmup: form.isWarmup ? 1 : 0,
        },
        form.exerciseLogId,
      );
      void queryClient.invalidateQueries({
        queryKey: workoutDayQueryKey(date),
      });
      dispatch({ type: "close-edit" });
      show({ message: "Set updated.", kind: "success" });
    } catch (error) {
      logger.error("Workout set update failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({
        message: "Could not update this set. Please try again.",
        kind: "error",
        action: { label: "Retry", onPress: () => { void saveEditSet(); } },
      });
    }
  };

  const confirmDeleteSet = async (set: SetLog, exercise: ExerciseLog) => {
    if (!(await confirmDestructive("Delete Set", `Remove Set ${set.set_number}?`))) {
      return;
    }

    try {
      const deleted = await deleteSetLog(set.id, exercise.id);
      if (!deleted) {
        show({ message: "This set is no longer available.", kind: "info" });
        return;
      }
      if (state.editId === set.id) dispatch({ type: "close-edit" });
      void queryClient.invalidateQueries({
        queryKey: workoutDayQueryKey(date),
      });
      void queryClient.invalidateQueries({ queryKey: ["home", date] });
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
      show({
        message: `Set ${set.set_number} deleted.`,
        kind: "info",
        durationMs: 5_000,
        action: {
          label: "Undo",
          onPress: () => {
            void restoreDeletedSet(set, exercise);
          },
        },
      });
    } catch (error) {
      logger.error("Set deletion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({
        message: "Could not delete this set.",
        kind: "error",
        action: { label: "Retry", onPress: () => { void confirmDeleteSet(set, exercise); } },
      });
    }
  };

  const restoreDeletedSet = async (set: SetLog, exercise: ExerciseLog) => {
    try {
      const restored = await restoreSetLog(set.id, exercise.id);
      if (!restored) throw new Error("The set could not be restored.");
      void queryClient.invalidateQueries({
        queryKey: workoutDayQueryKey(date),
      });
      void queryClient.invalidateQueries({ queryKey: ["home", date] });
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
      show({ message: `Set ${set.set_number} restored.`, kind: "success" });
    } catch (error) {
      logger.error("Set restore failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({
        message: "Could not restore this set.",
        kind: "error",
        action: {
          label: "Retry",
          onPress: () => { void restoreDeletedSet(set, exercise); },
        },
      });
    }
  };

  return {
    addSetForm: state.addForm,
    setAddSetForm: setAddForm,
    editingSetId: state.editId,
    setEditingSetId,
    editSetForm: state.editForm,
    setEditSetForm: setEditForm,
    logSet,
    openEditSet,
    saveEditSet,
    confirmDeleteSet,
    closeEditSet: () => dispatch({ type: "close-edit" }),
    markSetVisible,
    blankSetForm: (exercise: ExerciseLog, lastWeight: number | null) =>
      blankForm(
        exercise.id,
        exercise.exercise_name,
        (exercise.exercise_type as ExerciseType) ?? "weight_reps",
        lastWeight,
      ),
  };
}
