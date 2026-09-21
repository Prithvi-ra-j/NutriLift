import { db } from "../../db/client";
import { getDateDaysAgo, getTodayKey } from "../../dates";
import {
  dailyNutrition,
  workoutSessions,
  bodyStats,
  exerciseLogs,
  setLogs,
} from "../../db/schema";
import { gte, desc, eq } from "drizzle-orm";
import { WeeklyContext } from "./weeklyCoach";
import { getUserProfile } from "../../db/queries/profile";

/**
 * Build weekly context from SQLite database for AI coach analysis
 */
export async function buildWeeklyContext(): Promise<WeeklyContext> {
  const now = new Date();
  const profile = await getUserProfile();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekAgoStr = getDateDaysAgo(7);
  const nowStr = getTodayKey();

  // Fetch all data in parallel
  const [nutrition, sessions, weights] = await Promise.all([
    // Last 7 days nutrition
    db
      .select()
      .from(dailyNutrition)
      .where(gte(dailyNutrition.date, weekAgoStr))
      .orderBy(dailyNutrition.date),

    // Last 7 days workouts
    db
      .select()
      .from(workoutSessions)
      .where(gte(workoutSessions.date, weekAgoStr))
      .orderBy(workoutSessions.date),

    // Last 14 days body weight for trend
    db
      .select()
      .from(bodyStats)
      .where(eq(bodyStats.type, "weight"))
      .orderBy(desc(bodyStats.date))
      .limit(14),
  ]);

  // Get detailed workout data (exercises and sets)
  const workoutsWithDetails = await Promise.all(
    sessions.map(async (session: any) => {
      const exercises = await db
        .select()
        .from(exerciseLogs)
        .where(eq(exerciseLogs.session_id, session.id));

      const exercisesWithSets = await Promise.all(
        exercises.map(async (exercise: any) => {
          const sets = await db
            .select()
            .from(setLogs)
            .where(eq(setLogs.exercise_log_id, exercise.id));

          return {
            name: exercise.exercise_name,
            sets: sets.length,
            reps: sets[0]?.reps || 0,
            weight: sets[0]?.weight_kg || 0,
          };
        })
      );

      return {
        date: session.date,
        type: session.day_type,
        completed: !!session.ended_at,
        exercises: exercisesWithSets,
      };
    })
  );

  // Build context object
  const context: WeeklyContext = {
    weekRange: `${weekAgoStr} to ${nowStr}`,
    goal: "User-configured goal",
    targetCalories: profile?.calories_target ?? 0,
    targetProtein: profile?.protein_target_g ?? 0,
    days: nutrition.map((n: any) => ({
      date: n.date,
      calories: n.total_calories,
      protein: n.total_protein_g,
      carbs: n.total_carbs_g,
      fat: n.total_fat_g,
      logged: true,
    })),
    workouts: workoutsWithDetails,
    bodyWeight: weights.map((w: any) => ({
      date: w.date,
      weight: w.weight_kg || 0,
    })),
    currentWeight: weights[0]?.weight_kg || 0,
    startWeight: weights[weights.length - 1]?.weight_kg || 0,
    targetWeight: 0,
  };

  return context;
}

/**
 * Build context for a specific date range
 */
export async function buildCustomContext(
  startDate: string,
  endDate: string
): Promise<WeeklyContext> {
  const profile = await getUserProfile();
  const [nutrition, sessions, weights] = await Promise.all([
    db
      .select()
      .from(dailyNutrition)
      .where(gte(dailyNutrition.date, startDate))
      .orderBy(dailyNutrition.date),

    db
      .select()
      .from(workoutSessions)
      .where(gte(workoutSessions.date, startDate))
      .orderBy(workoutSessions.date),

    db
      .select()
      .from(bodyStats)
      .where(eq(bodyStats.type, "weight"))
      .orderBy(desc(bodyStats.date))
      .limit(30),
  ]);

  const workoutsWithDetails = await Promise.all(
    sessions.map(async (session: any) => {
      const exercises = await db
        .select()
        .from(exerciseLogs)
        .where(eq(exerciseLogs.session_id, session.id));

      const exercisesWithSets = await Promise.all(
        exercises.map(async (exercise: any) => {
          const sets = await db
            .select()
            .from(setLogs)
            .where(eq(setLogs.exercise_log_id, exercise.id));

          return {
            name: exercise.exercise_name,
            sets: sets.length,
            reps: sets[0]?.reps || 0,
            weight: sets[0]?.weight_kg || 0,
          };
        })
      );

      return {
        date: session.date,
        type: session.day_type,
        completed: !!session.ended_at,
        exercises: exercisesWithSets,
      };
    })
  );

  return {
    weekRange: `${startDate} to ${endDate}`,
    goal: "User-configured goal",
    targetCalories: profile?.calories_target ?? 0,
    targetProtein: profile?.protein_target_g ?? 0,
    days: nutrition.map((n: any) => ({
      date: n.date,
      calories: n.total_calories,
      protein: n.total_protein_g,
      carbs: n.total_carbs_g,
      fat: n.total_fat_g,
      logged: true,
    })),
    workouts: workoutsWithDetails,
    bodyWeight: weights.map((w: any) => ({
      date: w.date,
      weight: w.weight_kg || 0,
    })),
    currentWeight: weights[0]?.weight_kg || 0,
    startWeight: weights[weights.length - 1]?.weight_kg || 0,
    targetWeight: 0,
  };
}
