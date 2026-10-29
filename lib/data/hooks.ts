import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nowIso } from "../time/clock";
import type { NewSetLog, SetLog } from "./types";
import { getHomeSummary } from "./repositories/home";
import { getNutritionDay } from "./repositories/nutrition";
import {
  getProgressOverview,
  type ProgressOverviewRange,
} from "./repositories/progress";
import {
  getWorkoutDay,
  insertSetLog,
  type WorkoutDayData,
} from "./repositories/workout";

export const workoutDayQueryKey = (date: string) => ["workout", date] as const;

export function useWorkoutDay(date: string) {
  return useQuery({
    queryKey: workoutDayQueryKey(date),
    queryFn: () => getWorkoutDay(date),
  });
}

export function useLogSet(date: string) {
  const queryClient = useQueryClient();
  const queryKey = workoutDayQueryKey(date);

  return useMutation({
    mutationFn: (set: NewSetLog) => insertSetLog(set),
    onMutate: async (set) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutDayData>(queryKey);
      if (previous) {
        const exercise = previous.exercises.find(
          (item) => item.id === set.exercise_log_id,
        );
        const savedSet: SetLog = {
          ...set,
          duration_sec: set.duration_sec ?? null,
          distance_km: set.distance_km ?? null,
          rpe: set.rpe ?? null,
          is_pr: 0,
          is_warmup: set.is_warmup ?? 0,
          notes: set.notes ?? null,
          updated_at: nowIso(),
          deleted_at: null,
        };
        const sets = previous.setsByExercise[set.exercise_log_id] ?? [];
        const addsVolume =
          !savedSet.is_warmup &&
          (exercise?.exercise_type === "weight_reps" ||
            exercise?.exercise_type === "bodyweight_reps");
        queryClient.setQueryData<WorkoutDayData>(queryKey, {
          ...previous,
          setsByExercise: {
            ...previous.setsByExercise,
            [set.exercise_log_id]: [...sets, savedSet],
          },
          session:
            previous.session && addsVolume
              ? {
                  ...previous.session,
                  total_volume_kg:
                    (previous.session.total_volume_kg ?? 0) +
                    savedSet.weight_kg * savedSet.reps,
                }
              : previous.session,
        });
      }
      return { previous };
    },
    onError: (_error, _set, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (result, set) => {
      queryClient.setQueryData<WorkoutDayData>(queryKey, (current) => {
        if (!current) return current;
        const sets = current.setsByExercise[set.exercise_log_id] ?? [];
        return {
          ...current,
          setsByExercise: {
            ...current.setsByExercise,
            [set.exercise_log_id]: sets.map((item) =>
              item.id === set.id ? result.saved : item,
            ),
          },
          session: result.summary.session ?? current.session,
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["home", date] });
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useNutritionDay(date: string, asOfDate: string) {
  return useQuery({
    queryKey: ["nutrition", date, asOfDate],
    queryFn: () => getNutritionDay(date, asOfDate),
  });
}

export function useHomeSummary(date: string) {
  return useQuery({
    queryKey: ["home", date],
    queryFn: () => getHomeSummary(date),
  });
}

export function useProgress(range: ProgressOverviewRange) {
  return useQuery({
    queryKey: ["progress", range],
    queryFn: () => getProgressOverview(range),
  });
}
