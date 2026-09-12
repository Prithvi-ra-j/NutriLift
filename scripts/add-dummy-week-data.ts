// @ts-nocheck
/**
 * Script to add dummy data for a full week (Monday to Sunday)
 * This will populate nutrition, workout, and recovery data
 */

import { db } from "../lib/db/client";
import { foodLogs, dailyNutrition, workoutSessions, exerciseLogs, setLogs, recoveryLogs } from "../lib/db/schema";
import uuid from "react-native-uuid";

// Get dates for the current week (Monday to Sunday)
function getCurrentWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

// Meal templates
const MEAL_TEMPLATES = {
  breakfast: [
    { name: "Scrambled Eggs", quantity_g: 200, calories: 280, protein_g: 24, carbs_g: 4, fat_g: 18, fiber_g: 0 },
    { name: "Whole Wheat Toast", quantity_g: 60, calories: 160, protein_g: 6, carbs_g: 28, fat_g: 2, fiber_g: 4 },
    { name: "Banana", quantity_g: 120, calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0, fiber_g: 3 },
  ],
  lunch: [
    { name: "Grilled Chicken Breast", quantity_g: 200, calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7, fiber_g: 0 },
    { name: "Brown Rice", quantity_g: 150, calories: 170, protein_g: 4, carbs_g: 36, fat_g: 1, fiber_g: 2 },
    { name: "Mixed Vegetables", quantity_g: 150, calories: 75, protein_g: 3, carbs_g: 15, fat_g: 0, fiber_g: 5 },
  ],
  snack: [
    { name: "Greek Yogurt", quantity_g: 200, calories: 140, protein_g: 20, carbs_g: 10, fat_g: 3, fiber_g: 0 },
    { name: "Almonds", quantity_g: 30, calories: 170, protein_g: 6, carbs_g: 6, fat_g: 15, fiber_g: 3 },
  ],
  dinner: [
    { name: "Salmon Fillet", quantity_g: 180, calories: 360, protein_g: 40, carbs_g: 0, fat_g: 22, fiber_g: 0 },
    { name: "Sweet Potato", quantity_g: 200, calories: 180, protein_g: 4, carbs_g: 41, fat_g: 0, fiber_g: 6 },
    { name: "Broccoli", quantity_g: 150, calories: 50, protein_g: 4, carbs_g: 10, fat_g: 0, fiber_g: 4 },
  ],
};

// Workout templates by day
const WORKOUT_TEMPLATES = {
  "Push A": [
    { exercise: "Bench Press", muscle: "chest", equipment: "barbell", sets: [
      { weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 7 }
    ]},
    { exercise: "Incline Dumbbell Press", muscle: "chest", equipment: "dumbbell", sets: [
      { weight: 30, reps: 10 }, { weight: 30, reps: 10 }, { weight: 30, reps: 9 }
    ]},
    { exercise: "Overhead Press", muscle: "shoulders", equipment: "barbell", sets: [
      { weight: 50, reps: 8 }, { weight: 50, reps: 8 }, { weight: 50, reps: 7 }
    ]},
    { exercise: "Tricep Dips", muscle: "triceps", equipment: "bodyweight", sets: [
      { weight: 0, reps: 12 }, { weight: 0, reps: 11 }, { weight: 0, reps: 10 }
    ]},
  ],
  "Pull A": [
    { exercise: "Deadlift", muscle: "back", equipment: "barbell", sets: [
      { weight: 120, reps: 5 }, { weight: 120, reps: 5 }, { weight: 120, reps: 5 }
    ]},
    { exercise: "Pull-ups", muscle: "back", equipment: "bodyweight", sets: [
      { weight: 0, reps: 10 }, { weight: 0, reps: 9 }, { weight: 0, reps: 8 }
    ]},
    { exercise: "Barbell Row", muscle: "back", equipment: "barbell", sets: [
      { weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 70, reps: 7 }
    ]},
    { exercise: "Bicep Curls", muscle: "biceps", equipment: "dumbbell", sets: [
      { weight: 15, reps: 12 }, { weight: 15, reps: 11 }, { weight: 15, reps: 10 }
    ]},
  ],
  "Legs A": [
    { exercise: "Back Squat", muscle: "quads", equipment: "barbell", sets: [
      { weight: 100, reps: 8 }, { weight: 100, reps: 8 }, { weight: 100, reps: 7 }
    ]},
    { exercise: "Romanian Deadlift", muscle: "hamstrings", equipment: "barbell", sets: [
      { weight: 80, reps: 10 }, { weight: 80, reps: 10 }, { weight: 80, reps: 9 }
    ]},
    { exercise: "Leg Press", muscle: "quads", equipment: "machine", sets: [
      { weight: 150, reps: 12 }, { weight: 150, reps: 12 }, { weight: 150, reps: 11 }
    ]},
    { exercise: "Calf Raises", muscle: "calves", equipment: "machine", sets: [
      { weight: 60, reps: 15 }, { weight: 60, reps: 15 }, { weight: 60, reps: 14 }
    ]},
  ],
  "Push B": [
    { exercise: "Incline Barbell Press", muscle: "chest", equipment: "barbell", sets: [
      { weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 70, reps: 7 }
    ]},
    { exercise: "Dumbbell Flyes", muscle: "chest", equipment: "dumbbell", sets: [
      { weight: 20, reps: 12 }, { weight: 20, reps: 11 }, { weight: 20, reps: 10 }
    ]},
    { exercise: "Lateral Raises", muscle: "shoulders", equipment: "dumbbell", sets: [
      { weight: 12, reps: 15 }, { weight: 12, reps: 14 }, { weight: 12, reps: 13 }
    ]},
    { exercise: "Tricep Pushdowns", muscle: "triceps", equipment: "cable", sets: [
      { weight: 30, reps: 12 }, { weight: 30, reps: 12 }, { weight: 30, reps: 11 }
    ]},
  ],
  "Pull B": [
    { exercise: "Lat Pulldown", muscle: "back", equipment: "cable", sets: [
      { weight: 60, reps: 10 }, { weight: 60, reps: 10 }, { weight: 60, reps: 9 }
    ]},
    { exercise: "Cable Row", muscle: "back", equipment: "cable", sets: [
      { weight: 70, reps: 10 }, { weight: 70, reps: 10 }, { weight: 70, reps: 9 }
    ]},
    { exercise: "Face Pulls", muscle: "shoulders", equipment: "cable", sets: [
      { weight: 25, reps: 15 }, { weight: 25, reps: 15 }, { weight: 25, reps: 14 }
    ]},
    { exercise: "Hammer Curls", muscle: "biceps", equipment: "dumbbell", sets: [
      { weight: 15, reps: 12 }, { weight: 15, reps: 11 }, { weight: 15, reps: 10 }
    ]},
  ],
  "Legs B": [
    { exercise: "Front Squat", muscle: "quads", equipment: "barbell", sets: [
      { weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 7 }
    ]},
    { exercise: "Leg Curl", muscle: "hamstrings", equipment: "machine", sets: [
      { weight: 50, reps: 12 }, { weight: 50, reps: 12 }, { weight: 50, reps: 11 }
    ]},
    { exercise: "Bulgarian Split Squat", muscle: "quads", equipment: "dumbbell", sets: [
      { weight: 20, reps: 10 }, { weight: 20, reps: 10 }, { weight: 20, reps: 9 }
    ]},
    { exercise: "Leg Extension", muscle: "quads", equipment: "machine", sets: [
      { weight: 60, reps: 15 }, { weight: 60, reps: 14 }, { weight: 60, reps: 13 }
    ]},
  ],
  "Cardio": [
    { exercise: "Treadmill Run", muscle: "cardio", equipment: "machine", sets: [
      { weight: 0, reps: 30 } // 30 minutes
    ]},
    { exercise: "Stretching", muscle: "flexibility", equipment: "bodyweight", sets: [
      { weight: 0, reps: 15 } // 15 minutes
    ]},
  ],
};

async function addDummyWeekData() {
  console.log("🚀 Starting to add dummy week data...");
  
  const dates = getCurrentWeekDates();
  const dayTypes = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Cardio"];
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dayType = dayTypes[i];
    const now = Math.floor(Date.now() / 1000);
    
    console.log(`\n📅 Adding data for ${date} (${dayType})...`);
    
    // 1. Add food logs
    console.log("  🍽️  Adding food logs...");
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    
    for (const [meal, foods] of Object.entries(MEAL_TEMPLATES)) {
      for (const food of foods) {
        await db.insert(foodLogs).values({
          id: uuid.v4() as string,
          date,
          meal: meal as "breakfast" | "lunch" | "snack" | "dinner",
          name: food.name,
          quantity_g: food.quantity_g,
          calories: food.calories,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          fiber_g: food.fiber_g,
          sugar_g: null,
          sodium_mg: null,
          source: "manual",
          raw_input: null,
          created_at: now,
        });
        
        totalCalories += food.calories;
        totalProtein += food.protein_g;
        totalCarbs += food.carbs_g;
        totalFat += food.fat_g;
        totalFiber += food.fiber_g || 0;
      }
    }
    
    // 2. Add daily nutrition summary
    console.log("  📊 Adding daily nutrition summary...");
    await db.insert(dailyNutrition).values({
      date,
      total_calories: totalCalories,
      total_protein_g: totalProtein,
      total_carbs_g: totalCarbs,
      total_fat_g: totalFat,
      protein_target_met: totalProtein >= 180 ? 1 : 0,
      calorie_target_met: totalCalories >= 2800 && totalCalories <= 3200 ? 1 : 0,
      adherence_score: Math.min(100, (totalProtein / 180) * 100),
      notes: null,
    });
    
    // 3. Add workout session
    console.log(`  💪 Adding ${dayType} workout...`);
    const sessionId = uuid.v4() as string;
    let totalVolume = 0;
    
    const workoutTemplate = WORKOUT_TEMPLATES[dayType as keyof typeof WORKOUT_TEMPLATES];
    
    await db.insert(workoutSessions).values({
      id: sessionId,
      date,
      day_type: dayType,
      started_at: now - 3600, // 1 hour ago
      ended_at: now,
      duration_min: 60,
      total_volume_kg: 0, // Will update after calculating
      notes: null,
      rpe: 7,
    });
    
    // 4. Add exercises and sets
    for (let j = 0; j < workoutTemplate.length; j++) {
      const exercise = workoutTemplate[j];
      const exerciseId = uuid.v4() as string;
      
      await db.insert(exerciseLogs).values({
        id: exerciseId,
        session_id: sessionId,
        date,
        exercise_name: exercise.exercise,
        muscle_group: exercise.muscle,
        equipment: exercise.equipment,
        order_in_session: j + 1,
      });
      
      // Add sets
      for (let k = 0; k < exercise.sets.length; k++) {
        const set = exercise.sets[k];
        const volume = set.weight * set.reps;
        totalVolume += volume;
        
        await db.insert(setLogs).values({
          id: uuid.v4() as string,
          exercise_log_id: exerciseId,
          set_number: k + 1,
          weight_kg: set.weight,
          reps: set.reps,
          rpe: 7,
          is_pr: 0,
          is_warmup: 0,
          notes: null,
          logged_at: now,
        });
      }
    }
    
    // Update session with total volume
    await db.update(workoutSessions)
      .set({ total_volume_kg: totalVolume })
      .where((session) => session.id === sessionId);
    
    // 5. Add recovery log
    console.log("  😴 Adding recovery log...");
    await db.insert(recoveryLogs).values({
      date,
      sleep_duration_hr: 7 + Math.random() * 1.5, // 7-8.5 hours
      sleep_quality: Math.floor(3 + Math.random() * 2), // 3-5
      bedtime: "23:00",
      wake_time: "07:00",
      hrv: Math.floor(50 + Math.random() * 30), // 50-80
      resting_hr: Math.floor(55 + Math.random() * 10), // 55-65
      energy_level: Math.floor(3 + Math.random() * 2), // 3-5
      muscle_soreness: Math.floor(2 + Math.random() * 2), // 2-4
      stress_level: Math.floor(2 + Math.random() * 2), // 2-4
      notes: null,
    });
    
    console.log(`  ✅ Completed ${date}`);
  }
  
  console.log("\n🎉 Dummy week data added successfully!");
  console.log("📊 Summary:");
  console.log(`  - ${dates.length} days of nutrition data`);
  console.log(`  - ${dates.length} workout sessions`);
  console.log(`  - ${dates.length} recovery logs`);
}

// Run the script
addDummyWeekData()
  .then(() => {
    console.log("\n✨ Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
