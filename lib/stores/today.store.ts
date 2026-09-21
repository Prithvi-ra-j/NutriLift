import { create } from "zustand";
import { getTodayKey } from "../dates";
import { immer } from "zustand/middleware/immer";
import type { FoodLog, DailyNutrition, WorkoutSession, ExerciseLog, SetLog } from "../db/schema";

interface TodayState {
  date: string;
  nutrition: DailyNutrition | null;
  foodLogs: FoodLog[];
  session: WorkoutSession | null;
  exercises: ExerciseLog[];
  sets: Record<string, SetLog[]>; // exerciseLogId -> sets
  isLoading: boolean;

  // Actions
  setDate: (date: string) => void;
  setNutrition: (nutrition: DailyNutrition | null) => void;
  setFoodLogs: (logs: FoodLog[]) => void;
  addFoodLog: (log: FoodLog) => void;
  removeFoodLog: (id: string) => void;
  setSession: (session: WorkoutSession | null) => void;
  setExercises: (exercises: ExerciseLog[]) => void;
  addExercise: (exercise: ExerciseLog) => void;
  removeExercise: (id: string) => void;
  setSetsForExercise: (exerciseLogId: string, sets: SetLog[]) => void;
  addSet: (exerciseLogId: string, newSet: SetLog) => void;
  removeSet: (exerciseLogId: string, setId: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const today = getTodayKey();

export const useTodayStore = create<TodayState>()(
  immer((set) => ({
    date: today,
    nutrition: null,
    foodLogs: [],
    session: null,
    exercises: [],
    sets: {},
    isLoading: false,

    setDate: (date) =>
      set((state) => {
        state.date = date;
      }),

    setNutrition: (nutrition) =>
      set((state) => {
        state.nutrition = nutrition;
      }),

    setFoodLogs: (logs) =>
      set((state) => {
        state.foodLogs = logs;
      }),

    addFoodLog: (log) =>
      set((state) => {
        state.foodLogs.push(log);
      }),

    removeFoodLog: (id) =>
      set((state) => {
        state.foodLogs = state.foodLogs.filter((l) => l.id !== id);
      }),

    setSession: (session) =>
      set((state) => {
        state.session = session;
      }),

    setExercises: (exercises) =>
      set((state) => {
        state.exercises = exercises;
      }),

    addExercise: (exercise) =>
      set((state) => {
        state.exercises.push(exercise);
      }),

    removeExercise: (id) =>
      set((state) => {
        state.exercises = state.exercises.filter((e) => e.id !== id);
        delete state.sets[id];
      }),

    setSetsForExercise: (exerciseLogId, sets) =>
      set((state) => {
        state.sets[exerciseLogId] = sets;
      }),

    addSet: (exerciseLogId, newSet) =>
      set((state) => {
        if (!state.sets[exerciseLogId]) {
          state.sets[exerciseLogId] = [];
        }
        state.sets[exerciseLogId].push(newSet);
      }),

    removeSet: (exerciseLogId, setId) =>
      set((state) => {
        if (state.sets[exerciseLogId]) {
          state.sets[exerciseLogId] = state.sets[exerciseLogId].filter(
            (s) => s.id !== setId
          );
        }
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    reset: () =>
      set((state) => {
        state.nutrition = null;
        state.foodLogs = [];
        state.session = null;
        state.exercises = [];
        state.sets = {};
      }),
  }))
);
