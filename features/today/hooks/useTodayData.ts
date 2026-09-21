import { useCallback, useEffect, useMemo, useState } from "react";
import { getDailyNutrition, getFoodLogsForDate, getLast7DaysNutrition } from "../../../lib/db/queries/nutrition";
import { getSessionSummaryForDate, type SessionSummary } from "../../../lib/db/queries/workout";
import { getRecoveryLog } from "../../../lib/db/queries/recovery";
import { getUserProfile } from "../../../lib/db/queries/profile";
import { getTodayKey, getDateDaysAgo } from "../../../lib/dates";
import type { FoodLog, UserProfileRow, DailyNutrition, RecoveryLog } from "../../../lib/db/schema";

const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;

export function useTodayData() {
  const today = getTodayKey();
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({ session: null, exerciseCount: 0, workingSetCount: 0 });
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<RecoveryLog | null>(null);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [week, setWeek] = useState<{ date: string; hit: boolean; logged: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [n, foods, sessionSummaryData, last7, recovery, profileData] = await Promise.all([
        getDailyNutrition(today),
        getFoodLogsForDate(today),
        getSessionSummaryForDate(today),
        getLast7DaysNutrition(),
        getRecoveryLog(today),
        getUserProfile(),
      ]);
      setNutrition(n);
      setFoodLogs(foods);
      setSessionSummary(sessionSummaryData);
      setProfile(profileData);
      setRecovery(recovery);
      setWeek(Array.from({ length: 7 }, (_, i) => {
        const date = getDateDaysAgo(6 - i);
        const row = last7.find((item) => item.date === date);
        return { date, hit: row?.protein_target_met === 1, logged: !!row };
      }));
      const recoveryValues = recovery ? [
        recovery.sleep_quality,
        recovery.energy_level,
        recovery.muscle_soreness == null ? null : 6 - recovery.muscle_soreness,
      ].filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
      setRecoveryScore(recoveryValues.length ? Math.round((recoveryValues.reduce((sum, value) => sum + value, 0) / recoveryValues.length / 5) * 100) : null);
    } catch (e) {
      console.error("Today load failed", e);
      setError("We couldn’t load today’s data. Your saved data is unchanged.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(
    () => Object.fromEntries(MEALS.map((meal) => [meal, foodLogs.filter((log) => log.meal === meal)])) as Record<string, FoodLog[]>,
    [foodLogs]
  );

  const targets = {
    calories: profile?.calories_target ?? 0,
    protein_g: profile?.protein_target_g ?? 0,
    carbs_g: profile?.carbs_target_g ?? 0,
    fat_g: profile?.fat_target_g ?? 0,
  };

  return {
    today, nutrition, foodLogs, session: sessionSummary.session, sessionSummary, recoveryScore, recovery, profile, week, groups, targets,
    displayName: profile?.display_name || "there",
    loading, refreshing, error,
    refresh: () => { setRefreshing(true); void load(); },
    retry: () => { setLoading(true); void load(); },
  };
}
