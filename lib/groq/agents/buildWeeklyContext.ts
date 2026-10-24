import { db } from "../../db/client";
import {
  dailyNutrition,
  workoutSessions,
  bodyStats,
  exerciseLogs,
  setLogs,
} from "../../db/schema";
import { gte, desc, eq } from "drizzle-orm";
import { WeeklyContext } from "./weeklyCoach";
import { addDays, localDateString } from "../../time/localDate";
import { getProfile, getTargetsForDate } from "../../data/profile";

/**
 * Build weekly context from SQLite database for AI coach analysis
 */
export async function buildWeeklyContext(): Promise<WeeklyContext> {
  const nowStr = localDateString();
  const weekAgoStr = addDays(nowStr, -6);

  // Fetch all data in parallel
  const [nutrition, sessions, weights, profile, targets] = await Promise.all([
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
    getProfile(),
    getTargetsForDate(nowStr),
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
    goal: profile?.goal_text || "General fitness",
    targetCalories: targets.calories,
    targetProtein: targets.protein_g,
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
    startWeight: weights[weights.length - 1]?.weight_kg ?? null,
    targetWeight: null,
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
  const [nutrition, sessions, weights, profile, targets] = await Promise.all([
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
    getProfile(),
    getTargetsForDate(endDate),
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
    goal: profile?.goal_text || "General fitness",
    targetCalories: targets.calories,
    targetProtein: targets.protein_g,
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
    startWeight: weights[weights.length - 1]?.weight_kg ?? null,
    targetWeight: null,
  };
}
