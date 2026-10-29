import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "expo-router";
import { useWorkoutDay, getLastWeightForExercise } from "../../lib/data";
import { EXERCISE_LIBRARY, type DayType, type ExerciseType } from "../../lib/constants/exercises";
import { WORKOUT_TEMPLATES } from "../../lib/constants/workout-templates";
import { Card } from "../../components/ui/Card";
import { DateNavigator } from "../../components/ui/DateNavigator";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import type { WorkoutSession, ExerciseLog, SetLog } from "../../lib/data/types";
import { M3 } from "../../design-system/tokens";
import { dayOfWeek } from "../../lib/time/localDate";
import { logger } from "../../lib/logger";
import { ExerciseList } from "./ExerciseList";
import {
  blankForm,
} from "./workoutTypes";
import { DayTypeTabs } from "./DayTypeTabs";
import { WorkoutSummaryBar } from "./WorkoutSummaryBar";
import {
  WorkoutLoadingShell,
  WorkoutScreenShell,
} from "./WorkoutScreenShell";
import { useWorkoutScreenDate } from "./useWorkoutScreenDate";
import { defaultDayType, useWorkoutUiReducer } from "./workoutUiReducer";
import { useSetLogger } from "./useSetLogger";
import { WorkoutDialogs } from "./WorkoutDialogs";
import { useWorkoutActions } from "./useWorkoutActions";


// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const { selectedDate, setSelectedDate } = useWorkoutScreenDate();
  const { state: ui, setField: setUi } = useWorkoutUiReducer(selectedDate);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [sets, setSets] = useState<Record<string, SetLog[]>>({});
  const {
    data: workoutDay,
    error,
    isError,
    isLoading,
    refetch,
  } = useWorkoutDay(selectedDate);
  const setLogger = useSetLogger({ date: selectedDate, setsByExercise: sets });
  const loadError = isError
    ? "Could not load this workout. Please retry."
    : null;

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  // ── Set form state ──

  // ── Swap exercise state ──

  // ── Custom Exercise state ──

  // ── Edit Logged Exercise state ──

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (error) {
      logger.error("Workout load failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

  useEffect(() => {
    if (!workoutDay) return;
    setSession(workoutDay.session);
    setExercises(workoutDay.exercises);
    setSets(workoutDay.setsByExercise);
    setUi("customExercises", workoutDay.customExercises);
    setUi("completedDayTypes", new Set(workoutDay.completedDayTypes));
    setUi("selectedDayType", 
      workoutDay.session
        ? workoutDay.session.day_type as DayType
        : defaultDayType(selectedDate),
    );
    setLogger.setAddSetForm(null);
    setLogger.closeEditSet();
  }, [selectedDate, workoutDay]);

  useEffect(() => {
    for (const exerciseSets of Object.values(sets)) {
      for (const set of exerciseSets) setLogger.markSetVisible(set.id);
    }
  }, [sets, setLogger.markSetVisible]);

  const loadWorkout = async () => {
    await refetch();
  };

  // ─── Session ───────────────────────────────────────────────────────────────

  const {
    addExercise,
    createCustomExercise,
    addExercisesFromTemplate,
    confirmDeleteExercise,
    swapExercise,
    saveEditExercise,
  } = useWorkoutActions({
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
  });

  const allExercises = [
    ...EXERCISE_LIBRARY,
    ...ui.customExercises.map((c) => ({
      name: c.exercise_name,
      muscle_group: c.muscle_group || "other",
      equipment: c.equipment || "other",
      exercise_type: c.exercise_type as ExerciseType,
      day_types: ["Cardio", "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"] as DayType[],
    })),
  ];

  const filteredExercises = allExercises.filter((e) => {
    const isSunday = dayOfWeek(selectedDate) === 0;
    if (isSunday) {
      if (!e.day_types.includes("Cardio")) return false;
    } else {
      if (e.day_types.includes("Cardio") && e.day_types.length === 1) return false;
    }
    return (
      e.name.toLowerCase().includes(ui.exerciseSearch.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(ui.exerciseSearch.toLowerCase())
    );
  });

  const swapFilteredExercises = allExercises.filter((e) => {
    if (!ui.swapSearch) return true;
    return (
      e.name.toLowerCase().includes(ui.swapSearch.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(ui.swapSearch.toLowerCase())
    );
  });
  const selectedTemplate = WORKOUT_TEMPLATES[ui.selectedDayType] ?? [];

  if (isLoading) {
    return <WorkoutLoadingShell />;
  }

  return (
    <>
      <WorkoutScreenShell>
        {/* ── Header ── */}
        <ScreenHeader
          title="WORKOUT"
          subtitle={ui.selectedDayType}
          actionIcon="plus"
          actionLabel="Add Exercise"
          onAction={() => setUi("showAddExercise", true)}
        />

        {/* ── Date Navigator ── */}
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          showFullDate={false}
        />
        {loadError && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              void loadWorkout();
            }}
            style={{ padding: 14, borderRadius: 10, backgroundColor: M3.colors.errorContainer }}
          >
            <Text style={{ color: M3.colors.onErrorContainer, fontFamily: "DMSans_500Medium" }}>
              {loadError} Tap to retry.
            </Text>
          </TouchableOpacity>
        )}

        <DayTypeTabs
          completedDayTypes={ui.completedDayTypes}
          hasSession={!!session}
          isSunday={dayOfWeek(selectedDate) === 0}
          onOpenTemplate={() => {
            setUi("showTemplateSelector", true);
            setUi("selectedTemplateExercises", new Set(selectedTemplate.map((exercise) => exercise.name)));
          }}
          onSelectDayType={(dayType) => setUi("selectedDayType", dayType)}
          selectedDayType={ui.selectedDayType}
          templateExerciseCount={selectedTemplate.length}
        />
        {session && (
          <WorkoutSummaryBar
            exerciseCount={exercises.length}
            session={session}
            setCount={Object.values(sets).reduce((total, exerciseSets) => total + exerciseSets.length, 0)}
          />
        )}

        <ExerciseList
          addSetForm={setLogger.addSetForm}
          editSetForm={setLogger.editSetForm}
          editingSetId={setLogger.editingSetId}
          exercises={exercises}
          isSunday={dayOfWeek(selectedDate) === 0}
          onChangeAddSet={(partial) => setLogger.setAddSetForm((form) => form ? { ...form, ...partial } : null)}
          onChangeEditSet={(partial) => setLogger.setEditSetForm((form) => form ? { ...form, ...partial } : null)}
          onDeleteExercise={(exercise) => confirmDeleteExercise(exercise.id, exercise.exercise_name)}
          onDeleteSet={setLogger.confirmDeleteSet}
          onEditExercise={(exercise) => {
            setUi("editingExerciseId", exercise.id);
            setUi("editExerciseName", exercise.exercise_name);
            setUi("editExerciseMuscle", exercise.muscle_group || "");
            setUi("editExerciseEquip", exercise.equipment || "");
          }}
          onLogSet={setLogger.logSet}
          onOpenEditSet={setLogger.openEditSet}
          onSaveEditSet={setLogger.saveEditSet}
          onStartAddSet={async (exercise) => {
            const exerciseType = (exercise.exercise_type as ExerciseType) ?? "weight_reps";
            const lastWeight = exerciseType === "weight_reps"
              ? await getLastWeightForExercise(exercise.exercise_name)
              : null;
            setLogger.setAddSetForm(blankForm(exercise.id, exercise.exercise_name, exerciseType, lastWeight));
            setLogger.closeEditSet();
          }}
          onSwapExercise={(exercise) => {
            setUi("swapExerciseId", exercise.id);
            setUi("swapSearch", "");
          }}
          onCancelAddSet={() => setLogger.setAddSetForm(null)}
          onCancelEditSet={setLogger.closeEditSet}
          progressionAlerts={ui.progressionAlerts}
          session={session}
          sets={sets}
        />

    </WorkoutScreenShell>

      {/* ── Add Exercise Modal ── */}
      <WorkoutDialogs
        ui={ui}
        setUi={setUi}
        filteredExercises={filteredExercises}
        swapFilteredExercises={swapFilteredExercises}
        addExercise={addExercise}
        createCustomExercise={createCustomExercise}
        addExercisesFromTemplate={addExercisesFromTemplate}
        swapExercise={swapExercise}
        saveEditExercise={saveEditExercise}
      />
    </>
  );
}
