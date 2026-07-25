// Utility to add dummy data for testing
// Run this once to populate the database with sample data

import { addDummyWeekData } from "../db/seed-dummy-data";

export async function addDummyNutritionData() {
  // Deprecated - use addDummyWeekData instead
  console.log("⚠️  addDummyNutritionData is deprecated. Use addDummyWeekData instead.");
}

export async function addDummyWorkoutData() {
  // Deprecated - use addDummyWeekData instead
  console.log("⚠️  addDummyWorkoutData is deprecated. Use addDummyWeekData instead.");
}

export async function addAllDummyData() {
  try {
    console.log("🚀 Adding comprehensive week data...");
    await addDummyWeekData();
    console.log("✅ All dummy data added successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error adding dummy data:", error);
    return false;
  }
}
