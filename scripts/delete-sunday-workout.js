/**
 * Script to delete Sunday's workout
 * Run this with: node scripts/delete-sunday-workout.js
 */

const { drizzle } = require('drizzle-orm/expo-sqlite');
const { openDatabaseSync } = require('expo-sqlite');
const { eq } = require('drizzle-orm');

// Import schema
const schema = require('../lib/db/schema');

const expoDb = openDatabaseSync('apex.db');
const db = drizzle(expoDb);

async function deleteWorkoutForDate(date) {
  console.log(`Deleting workout for date: ${date}`);
  
  // Get the session for this date
  const sessions = await db
    .select()
    .from(schema.workoutSessions)
    .where(eq(schema.workoutSessions.date, date));
  
  if (sessions.length === 0) {
    console.log("No workout found for this date");
    return;
  }
  
  const sessionId = sessions[0].id;
  console.log(`Found session: ${sessionId} - ${sessions[0].day_type}`);
  
  // Get all exercises for this session
  const exercises = await db
    .select()
    .from(schema.exerciseLogs)
    .where(eq(schema.exerciseLogs.session_id, sessionId));
  
  console.log(`Found ${exercises.length} exercises`);
  
  // Delete all sets for each exercise
  for (const exercise of exercises) {
    await db.delete(schema.setLogs).where(eq(schema.setLogs.exercise_log_id, exercise.id));
    console.log(`Deleted sets for exercise: ${exercise.exercise_name}`);
  }
  
  // Delete all exercises
  await db.delete(schema.exerciseLogs).where(eq(schema.exerciseLogs.session_id, sessionId));
  console.log("Deleted all exercises");
  
  // Delete the session
  await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, sessionId));
  console.log("Deleted session");
  
  console.log("✅ Workout deleted successfully!");
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`🗑️  Deleting workout for ${today}...\n`);
  
  try {
    await deleteWorkoutForDate(today);
    console.log("\n✅ Done! Restart your app to see the changes.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
