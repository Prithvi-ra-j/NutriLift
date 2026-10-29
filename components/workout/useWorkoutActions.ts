import type { Dispatch, SetStateAction } from "react";
import {
  insertSession,
  insertExerciseLog,
  addTemplateExercises,
  deleteExerciseLog,
  updateExerciseLog,
  checkDoubleProgression,
  getLastWeightForExercise,
  insertCustomExercise,
} from "../../lib/data";
import { EXERCISE_LIBRARY, type ExerciseType } from "../../lib/constants/exercises";
import { WORKOUT_TEMPLATES } from "../../lib/constants/workout-templates";
import type { WorkoutSession, ExerciseLog, SetLog, CustomExercise } from "../../lib/data/types";
import uuid from "react-native-uuid";
import { nowIso, nowUnix } from "../../lib/time/clock";
import { logger } from "../../lib/logger";
import { useWorkoutUiReducer } from "./workoutUiReducer";
import { useSetLogger } from "./useSetLogger";
import { blankForm } from "./workoutTypes";
import { confirmDestructive } from "../ui/confirmDestructive";
import { useToast } from "../ui/Toast";

type UiState = ReturnType<typeof useWorkoutUiReducer>["state"];
type UiSetter = ReturnType<typeof useWorkoutUiReducer>["setField"];
type SetLogger = ReturnType<typeof useSetLogger>;

interface UseWorkoutActionsOptions {
  selectedDate: string;
  ui: UiState;
  setUi: UiSetter;
  session: WorkoutSession | null;
  setSession: Dispatch<SetStateAction<WorkoutSession | null>>;
  exercises: ExerciseLog[];
  setExercises: Dispatch<SetStateAction<ExerciseLog[]>>;
  setSets: Dispatch<SetStateAction<Record<string, SetLog[]>>>;
  setLogger: SetLogger;
  loadWorkout: () => Promise<void>;
}

export function useWorkoutActions({
  selectedDate,
  ui,
  setUi,
  session,
  setSession,
  exercises,
  setExercises,
  setSets,
  setLogger,
  loadWorkout,
}: UseWorkoutActionsOptions) {
  const { show: showToast } = useToast();

  const ensureSession = async (): Promise<string> => {
    if (session) return session.id;
    const sessionId = uuid.v4() as string;
    const newSession: WorkoutSession = {
      id: sessionId,
      date: selectedDate,
      day_type: ui.selectedDayType,
      started_at: nowUnix(),
      ended_at: null,
      duration_min: null,
      total_volume_kg: 0,
      notes: null,
      rpe: null,
      updated_at: nowIso(),
      deleted_at: null,
    };
    await insertSession(newSession);
    setSession(newSession);
    return sessionId;
  };

  // ─── Add Exercise ──────────────────────────────────────────────────────────

  const addExercise = async (exerciseName: string, muscleGroup: string, equipment: string, exerciseType: ExerciseType) => {
    const sessionId = await ensureSession();
    const exerciseId = uuid.v4() as string;
    const newExercise: ExerciseLog = {
      id: exerciseId,
      session_id: sessionId,
      date: selectedDate,
      exercise_name: exerciseName,
      muscle_group: muscleGroup,
      equipment,
      exercise_type: exerciseType,
      order_in_session: exercises.length + 1,
      updated_at: null,
      deleted_at: null,
    };
    await insertExerciseLog(newExercise);
    setExercises([...exercises, newExercise]);
    setSets((prev) => ({ ...prev, [exerciseId]: [] }));
    setUi("showAddExercise", false);
    setUi("exerciseSearch", "");

    const dp = await checkDoubleProgression(exerciseName);
    if (dp.shouldProgress) {
      setUi("progressionAlerts", (prev) => ({ ...prev, [exerciseId]: dp.message }));
    }

    const lastWeight = exerciseType === "weight_reps" ? await getLastWeightForExercise(exerciseName) : null;
    setLogger.setAddSetForm(blankForm(exerciseId, exerciseName, exerciseType, lastWeight));
  };

  const createCustomExercise = async () => {
    if (!ui.customExName.trim()) {
      showToast({ message: "Please enter an exercise name.", kind: "error" });
      return;
    }
    const newEx: CustomExercise = {
      id: uuid.v4() as string,
      exercise_name: ui.customExName.trim(),
      exercise_type: ui.customExType,
      muscle_group: ui.customExMuscle,
      equipment: ui.customExEquip,
      created_at: nowUnix(),
    };
    await insertCustomExercise(newEx);
    setUi("showCreateCustom", false);
    setUi("customExName", "");
    await loadWorkout();
    await addExercise(
      newEx.exercise_name,
      newEx.muscle_group || "other",
      newEx.equipment || "other",
      ui.customExType,
    );
  };

  // ─── Add Exercises from Template ───────────────────────────────────────────

  const addExercisesFromTemplate = async () => {
    if (ui.selectedTemplateExercises.size === 0) {
      showToast({ message: "Select at least one exercise.", kind: "error" });
      return;
    }
    const sessionId = await ensureSession();
    const template = WORKOUT_TEMPLATES[ui.selectedDayType] || [];
    const selectedExercises = template.filter((ex) => ui.selectedTemplateExercises.has(ex.name));

    await addTemplateExercises(
      sessionId,
      selectedExercises.map((exercise) => exercise.name),
    );

    setUi("showTemplateSelector", false);
    setUi("selectedTemplateExercises", new Set());
    await loadWorkout();
  };

  // ─── Delete Exercise ───────────────────────────────────────────────────────

  const confirmDeleteExercise = async (exerciseId: string, exerciseName: string) => {
    const confirmed = await confirmDestructive(
      "Delete Exercise",
      `Remove "${exerciseName}" and all its sets from today's workout?`,
    );
    if (!confirmed) return;

    try {
      await deleteExerciseLog(exerciseId);
      setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
      setSets((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      if (setLogger.addSetForm?.exerciseLogId === exerciseId) setLogger.setAddSetForm(null);
      if (setLogger.editSetForm?.exerciseLogId === exerciseId) {
        setLogger.setEditSetForm(null);
        setLogger.setEditingSetId(null);
      }
    } catch (error) {
      logger.error("Exercise deletion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ message: "Could not delete this exercise. Please retry.", kind: "error" });
    }
  };

  // ─── Swap Exercise ─────────────────────────────────────────────────────────

  const swapExercise = async (newExerciseName: string) => {
    if (!ui.swapExerciseId) return;
    const libEntry = EXERCISE_LIBRARY.find((e) => e.name === newExerciseName);
    if (!libEntry) return;

    await updateExerciseLog(ui.swapExerciseId, {
      exercise_name: libEntry.name,
      muscle_group: libEntry.muscle_group,
      equipment: libEntry.equipment,
      exercise_type: libEntry.exercise_type,
    });

    setUi("swapExerciseId", null);
    setUi("swapSearch", "");
    await loadWorkout();
  };

  // ─── Edit Exercise Log ─────────────────────────────────────────────────────

  const saveEditExercise = async () => {
    if (!ui.editingExerciseId) return;
    if (!ui.editExerciseName.trim()) {
      showToast({ message: "Exercise name cannot be empty.", kind: "error" });
      return;
    }
    await updateExerciseLog(ui.editingExerciseId, {
      exercise_name: ui.editExerciseName.trim(),
      muscle_group: ui.editExerciseMuscle,
      equipment: ui.editExerciseEquip,
    });
    setUi("editingExerciseId", null);
    await loadWorkout();
  };

  // ─── Log Set ───────────────────────────────────────────────────────────────


  return {
    addExercise,
    createCustomExercise,
    addExercisesFromTemplate,
    confirmDeleteExercise,
    swapExercise,
    saveEditExercise,
  };
}
