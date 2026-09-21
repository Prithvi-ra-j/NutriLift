import { eq } from "drizzle-orm";
import { getTodayKey, getDateDaysAgo, getLocalDateKey } from "../../dates";
import { db } from "../client";
import { workoutSessions, exerciseLogs, setLogs } from "../schema";

/**
 * Delete all workout data for a specific date
 * This will delete the session and all associated exercises and sets
 */
export async function deleteWorkoutForDate(date: string): Promise<void> {
  console.log(`Deleting workout for date: ${date}`);
  
  // Get the session for this date
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.date, date));
  
  if (sessions.length === 0) {
    console.log("No workout found for this date");
    return;
  }
  
  const sessionId = sessions[0].id;
  console.log(`Found session: ${sessionId}`);
  
  // Get all exercises for this session
  const exercises = await db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.session_id, sessionId));
  
  console.log(`Found ${exercises.length} exercises`);
  
  // Delete all sets for each exercise
  for (const exercise of exercises) {
    await db.delete(setLogs).where(eq(setLogs.exercise_log_id, exercise.id));
    console.log(`Deleted sets for exercise: ${exercise.exercise_name}`);
  }
  
  // Delete all exercises
  await db.delete(exerciseLogs).where(eq(exerciseLogs.session_id, sessionId));
  console.log("Deleted all exercises");
  
  // Delete the session
  await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
  console.log("Deleted session");
  
  console.log("✅ Workout deleted successfully!");
}

// Helper function to delete today's workout
export async function deleteTodayWorkout(): Promise<void> {
  const today = getTodayKey();
  await deleteWorkoutForDate(today);
}
