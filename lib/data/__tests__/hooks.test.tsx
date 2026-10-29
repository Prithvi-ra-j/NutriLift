import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import type { NewSetLog, SetLog } from "../types";
import type { WorkoutDayData } from "../repositories/workout";
import { useLogSet, workoutDayQueryKey } from "../hooks";
import { insertSetLog } from "../repositories/workout";

jest.mock("../repositories/workout", () => ({
  getWorkoutDay: jest.fn(),
  insertSetLog: jest.fn(),
}));
jest.mock("../repositories/home", () => ({ getHomeSummary: jest.fn() }));
jest.mock("../repositories/nutrition", () => ({ getNutritionDay: jest.fn() }));
jest.mock("../repositories/progress", () => ({
  getProgressOverview: jest.fn(),
}));

const insertSetLogMock = jest.mocked(insertSetLog);

function createWorkoutDay(): WorkoutDayData {
  return {
    session: null,
    exercises: [
      {
        id: "exercise-1",
        session_id: "session-1",
        date: "2026-07-14",
        exercise_name: "Bench press",
        muscle_group: "chest",
        equipment: "barbell",
        exercise_type: "weight_reps",
        order_in_session: 1,
        updated_at: null,
        deleted_at: null,
      },
    ],
    setsByExercise: { "exercise-1": [] },
    customExercises: [],
    completedDayTypes: [],
  };
}

function createSet(id: string): NewSetLog {
  return {
    id,
    exercise_log_id: "exercise-1",
    set_number: 1,
    weight_kg: 60,
    reps: 8,
    logged_at: 1_784_030_400,
  };
}

function createSavedSet(id: string): SetLog {
  return {
    ...createSet(id),
    duration_sec: null,
    distance_km: null,
    rpe: null,
    is_pr: 0,
    is_warmup: 0,
    notes: null,
    updated_at: "2026-07-14T09:00:00.000Z",
    deleted_at: null,
  };
}

function createHarness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }
  return { client, Wrapper };
}

describe("useLogSet", () => {
  beforeEach(() => {
    insertSetLogMock.mockReset();
  });

  it("optimistically appends a set and replaces it with the saved row", async () => {
    const { client, Wrapper } = createHarness();
    const key = workoutDayQueryKey("2026-07-14");
    client.setQueryData(key, createWorkoutDay());
    insertSetLogMock.mockResolvedValue({
      isPR: true,
      saved: { ...createSavedSet("temporary-set"), is_pr: 1 },
      summary: { session: null, personalRecord: null },
    });
    const { result } = await renderHook(
      () => useLogSet("2026-07-14"),
      { wrapper: Wrapper },
    );

    await act(async () => {
      result.current.mutate(createSet("temporary-set"));
    });
    await waitFor(() => {
      expect(
        client.getQueryData<WorkoutDayData>(key)?.setsByExercise["exercise-1"],
      ).toHaveLength(1);
    });
    expect(insertSetLogMock).toHaveBeenCalledWith(createSet("temporary-set"));
    expect(
      client.getQueryData<WorkoutDayData>(key)?.setsByExercise["exercise-1"]?.[0]
        ?.is_pr,
    ).toBe(1);
    client.clear();
  });

  it("rolls the optimistic set back when persistence fails", async () => {
    const { client, Wrapper } = createHarness();
    const key = workoutDayQueryKey("2026-07-14");
    client.setQueryData(key, createWorkoutDay());
    insertSetLogMock.mockRejectedValue(new Error("disk full"));
    const { result } = await renderHook(
      () => useLogSet("2026-07-14"),
      { wrapper: Wrapper },
    );

    await act(async () => {
      result.current.mutate(createSet("temporary-set"));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      client.getQueryData<WorkoutDayData>(key)?.setsByExercise["exercise-1"],
    ).toEqual([]);
    client.clear();
  });
});
