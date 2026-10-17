/**
 * Comprehensive seed script to populate ALL data types
 * - Nutrition logs (food logs + daily summaries)
 * - Workout sessions (exercises + sets)
 * - Recovery logs (sleep, HRV, soreness)
 * - Body stats (weight + InBody scans)
 * - Supplement logs (daily adherence)
 * - Personal Records (PRs for key lifts)
 * 
 * Usage: Import and call addDummyWeekData() from anywhere in the app
 */

import { db } from "./client";
import { 
  foodLogs, 
  dailyNutrition, 
  workoutSessions, 
  exerciseLogs, 
  setLogs, 
  recoveryLogs,
  bodyStats,
  supplementLogs,
  personalRecords
} from "./schema";
import uuid from "react-native-uuid";
import { eq } from "drizzle-orm";
import { USER_PROFILE } from "../constants/user-profile";

// Get dates for the last 30 days (a full month)
function getLast30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
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
const WORKOUT_TEMPLATES: Record<string, Array<{
  exercise: string;
  muscle: string;
  equipment: string;
  sets: Array<{ weight: number; reps: number }>;
}>> = {
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
  "Marathon": [
    { exercise: "Treadmill Run", muscle: "cardio", equipment: "machine", sets: [
      { weight: 0, reps: 20 } // 20 minutes
    ]},
    { exercise: "Stretching", muscle: "flexibility", equipment: "bodyweight", sets: [
      { weight: 0, reps: 10 } // 10 minutes
    ]},
  ],
};

export async function addDummyWeekData(): Promise<void> {
  console.log("🚀 Starting to add comprehensive dummy data (30 days)...");
  
  const dates = getLast30Days();
  const dayTypes = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
  
  // Track which day type to use (cycles through the 6-day split)
  let dayTypeIndex = 0;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ADD BODY STATS (Weight logs + InBody scan)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📊 Adding body stats...");
  
  // Add weight logs for each day (morning weigh-ins)
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const baseWeight = 75.0; // kg (from USER_PROFILE)
    const dailyVariation = (Math.random() - 0.5) * 0.4; // ±0.2kg daily fluctuation
    const weight = baseWeight + dailyVariation;
    
    await db.insert(bodyStats).values({
      id: uuid.v4() as string,
      date,
      type: "weight",
      weight_kg: parseFloat(weight.toFixed(1)),
      body_fat_pct: null,
      body_fat_mass_kg: null,
      skeletal_muscle_mass_kg: null,
      lean_body_mass_kg: null,
      bmi: null,
      inbody_score: null,
      tbw_l: null,
      ecw_tbw_ratio: null,
      visceral_fat_level: null,
      seg_muscle_right_arm: null,
      seg_muscle_left_arm: null,
      seg_muscle_trunk: null,
      seg_muscle_right_leg: null,
      seg_muscle_left_leg: null,
      seg_fat_right_arm: null,
      seg_fat_left_arm: null,
      seg_fat_trunk: null,
      seg_fat_right_leg: null,
      seg_fat_left_leg: null,
      raw_paste: null,
      source: "manual",
    });
  }
  
  // Add InBody scan (most recent - from USER_PROFILE April 9 data)
  await db.insert(bodyStats).values({
    id: uuid.v4() as string,
    date: "2026-04-09",
    type: "inbody",
    weight_kg: 75.0,
    body_fat_pct: 34.9,
    body_fat_mass_kg: 26.1, // 57.5 lb converted
    skeletal_muscle_mass_kg: 27.2, // 60 lb converted
    lean_body_mass_kg: 48.9,
    bmi: 26.0,
    inbody_score: 58,
    tbw_l: 36.5,
    ecw_tbw_ratio: 0.38,
    visceral_fat_level: 12,
    seg_muscle_right_arm: 3.2,
    seg_muscle_left_arm: 3.1,
    seg_muscle_trunk: 24.5,
    seg_muscle_right_leg: 9.8,
    seg_muscle_left_leg: 9.7,
    seg_fat_right_arm: 1.8,
    seg_fat_left_arm: 1.7,
    seg_fat_trunk: 14.2,
    seg_fat_right_leg: 4.2,
    seg_fat_left_leg: 4.1,
    raw_paste: null,
    source: "inbody_paste",
  });
  
  console.log("  ✅ Added weight logs and InBody scan");
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ADD SUPPLEMENT LOGS (Daily adherence)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n💊 Adding supplement logs...");
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const now = Math.floor(Date.now() / 1000);
    
    // Log each supplement from USER_PROFILE
    for (const supplement of USER_PROFILE.supplements) {
      // 85% adherence rate (randomly miss some)
      const taken = Math.random() > 0.15;
      
      await db.insert(supplementLogs).values({
        id: uuid.v4() as string,
        date,
        supplement_name: supplement.name,
        taken: taken ? 1 : 0,
        logged_at: now,
      });
    }
  }
  
  console.log("  ✅ Added supplement adherence logs");
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ADD PERSONAL RECORDS (PRs for key exercises)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🏆 Adding personal records...");
  
  const prData = [
    { exercise: "Bench Press", weight: 85, reps: 8, date: "2026-05-05" },
    { exercise: "Deadlift", weight: 125, reps: 5, date: "2026-05-06" },
    { exercise: "Back Squat", weight: 105, reps: 8, date: "2026-05-07" },
    { exercise: "Overhead Press", weight: 52.5, reps: 8, date: "2026-05-05" },
    { exercise: "Barbell Row", weight: 75, reps: 8, date: "2026-05-06" },
    { exercise: "Romanian Deadlift", weight: 85, reps: 10, date: "2026-05-07" },
    { exercise: "Incline Dumbbell Press", weight: 32.5, reps: 10, date: "2026-05-08" },
    { exercise: "Pull-ups", weight: 0, reps: 12, date: "2026-05-09" },
  ];
  
  for (const pr of prData) {
    const volume = pr.weight * pr.reps;
    // Epley formula: 1RM = weight × (1 + reps/30)
    const estimated1RM = pr.weight * (1 + pr.reps / 30);
    
    await db.insert(personalRecords).values({
      exercise_name: pr.exercise,
      best_weight_kg: pr.weight,
      best_reps_at_best_weight: pr.reps,
      best_1rm_estimated: parseFloat(estimated1RM.toFixed(1)),
      best_volume_single_set: volume,
      achieved_date: pr.date,
      previous_best_kg: pr.weight - 2.5, // Previous PR was 2.5kg less
      improvement_pct: parseFloat(((2.5 / (pr.weight - 2.5)) * 100).toFixed(1)),
    });
  }
  
  console.log("  ✅ Added personal records");
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ADD NUTRITION, WORKOUTS, AND RECOVERY (Daily logs)
  // ═══════════════════════════════════════════════════════════════════════════
  
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dayOfWeek = new Date(date).getDay();
    const now = Math.floor(Date.now() / 1000);
    
    // Skip Sunday (day 0) for workouts
    const isRestDay = dayOfWeek === 0;
    
    // Get day type (cycle through 6-day split, skip Sundays)
    let dayType = "";
    if (!isRestDay) {
      dayType = dayTypes[dayTypeIndex % dayTypes.length];
      dayTypeIndex++;
    }
    
    console.log(`\n📅 Adding data for ${date} (${isRestDay ? "REST DAY" : dayType})...`);
    
    // Check if data already exists for this date
    const existingNutrition = await db.select().from(dailyNutrition).where(eq(dailyNutrition.date, date));
    if (existingNutrition.length > 0) {
      console.log(`  ⏭️  Data already exists for ${date}, skipping...`);
      continue;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // 4a. Add food logs (with variability and edge cases)
    // ─────────────────────────────────────────────────────────────────────────
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Add variability: Some days have different eating patterns
    const randomFactor = Math.random();
    const skipBreakfast = randomFactor < 0.1; // 10% chance skip breakfast
    const extraSnack = randomFactor > 0.7; // 30% chance extra snack
    const lightDay = randomFactor > 0.85; // 15% chance light eating day
    const cheatDay = randomFactor < 0.05; // 5% chance cheat day (high calories)
    
    for (const [meal, foods] of Object.entries(MEAL_TEMPLATES)) {
      // Skip breakfast on some days
      if (meal === "breakfast" && skipBreakfast) continue;
      
      // Skip snack on light days
      if (meal === "snack" && lightDay) continue;
      
      for (const food of foods) {
        // Add portion variability (80-120% of normal)
        const portionMultiplier = cheatDay ? 1.5 : (lightDay ? 0.7 : (0.8 + Math.random() * 0.4));
        
        await db.insert(foodLogs).values({
          id: uuid.v4() as string,
          date,
          meal: meal as "breakfast" | "lunch" | "snack" | "dinner",
          name: food.name,
          quantity_g: Math.round(food.quantity_g * portionMultiplier),
          calories: Math.round(food.calories * portionMultiplier),
          protein_g: parseFloat((food.protein_g * portionMultiplier).toFixed(1)),
          carbs_g: parseFloat((food.carbs_g * portionMultiplier).toFixed(1)),
          fat_g: parseFloat((food.fat_g * portionMultiplier).toFixed(1)),
          fiber_g: food.fiber_g,
          sugar_g: null,
          sodium_mg: null,
          source: "manual",
          raw_input: null,
          created_at: now,
        });
        
        totalCalories += Math.round(food.calories * portionMultiplier);
        totalProtein += food.protein_g * portionMultiplier;
        totalCarbs += food.carbs_g * portionMultiplier;
        totalFat += food.fat_g * portionMultiplier;
      }
    }
    
    // Add extra snack on some days
    if (extraSnack) {
      await db.insert(foodLogs).values({
        id: uuid.v4() as string,
        date,
        meal: "snack",
        name: "Protein Shake",
        quantity_g: 300,
        calories: 200,
        protein_g: 30,
        carbs_g: 10,
        fat_g: 3,
        fiber_g: 2,
        sugar_g: null,
        sodium_mg: null,
        source: "manual",
        raw_input: null,
        created_at: now,
      });
      totalCalories += 200;
      totalProtein += 30;
      totalCarbs += 10;
      totalFat += 3;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // 4b. Add daily nutrition summary
    // ─────────────────────────────────────────────────────────────────────────
    const proteinTarget = USER_PROFILE.targets.protein_g;
    const calorieTarget = USER_PROFILE.targets.calories;
    
    await db.insert(dailyNutrition).values({
      date,
      total_calories: totalCalories,
      total_protein_g: totalProtein,
      total_carbs_g: totalCarbs,
      total_fat_g: totalFat,
      protein_target_met: totalProtein >= proteinTarget ? 1 : 0,
      calorie_target_met: Math.abs(totalCalories - calorieTarget) <= 200 ? 1 : 0,
      adherence_score: Math.min(100, (totalProtein / proteinTarget) * 100),
      notes: null,
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // 4c. Add workout session (Skip Sunday + add variability)
    // ─────────────────────────────────────────────────────────────────────────
    
    // Skip workout session creation for Sunday (day 0) or randomly skip 5% of workouts
    const missedWorkout = !isRestDay && Math.random() < 0.05; // 5% chance to miss a workout
    
    if (!isRestDay && !missedWorkout) {
      const sessionId = uuid.v4() as string;
      let totalVolume = 0;
      
      const workoutTemplate = WORKOUT_TEMPLATES[dayType];
      
      // Add workout duration variability (45-75 minutes)
      const duration = 45 + Math.floor(Math.random() * 30);
      
      // Add RPE variability (6-9)
      const rpe = 6 + Math.floor(Math.random() * 4);
      
      await db.insert(workoutSessions).values({
        id: sessionId,
        date,
        day_type: dayType,
        started_at: now - (duration * 60), // Started X minutes ago
        ended_at: now,
        duration_min: duration,
        total_volume_kg: 0, // Will update after calculating
        notes: null,
        rpe,
      });
      
      // ─────────────────────────────────────────────────────────────────────────
      // 4d. Add exercises and sets (with variability)
      // ─────────────────────────────────────────────────────────────────────────
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
        
        // Add sets with variability
        for (let k = 0; k < exercise.sets.length; k++) {
          const set = exercise.sets[k];
          
          // Add weight progression over time (earlier dates = lighter weight)
          const daysAgo = dates.length - 1 - i;
          const progressionFactor = 1 - (daysAgo * 0.01); // 1% lighter per day back
          
          // Add rep variability (±1-2 reps)
          const repVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
          
          const weight = Math.round(set.weight * progressionFactor * 2) / 2; // Round to nearest 0.5kg
          const reps = Math.max(1, set.reps + repVariation);
          const volume = weight * reps;
          totalVolume += volume;
          
          await db.insert(setLogs).values({
            id: uuid.v4() as string,
            exercise_log_id: exerciseId,
            set_number: k + 1,
            weight_kg: weight,
            reps,
            rpe: 6 + Math.floor(Math.random() * 4), // RPE 6-9
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
        .where(eq(workoutSessions.id, sessionId));
    } else if (missedWorkout) {
      console.log(`  ⏭️  Missed workout on ${date} (${dayType})`);
    } else {
      console.log(`  ⏭️  Rest day - no workout`);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // 4e. Add recovery log (with variability and edge cases)
    // ─────────────────────────────────────────────────────────────────────────
    
    // Add variability based on workout intensity
    const hadWorkout = !isRestDay && !missedWorkout;
    const baseSleep = 7 + Math.random() * 1.5; // 7-8.5 hours
    const sleepQuality = hadWorkout ? Math.floor(2 + Math.random() * 3) : Math.floor(3 + Math.random() * 3); // 2-5 or 3-5
    const energyLevel = hadWorkout ? Math.floor(2 + Math.random() * 3) : Math.floor(3 + Math.random() * 3);
    const soreness = hadWorkout ? Math.floor(3 + Math.random() * 3) : Math.floor(1 + Math.random() * 3); // More sore after workout
    const stressLevel = Math.floor(2 + Math.random() * 3); // 2-5
    
    // Edge case: Some days have poor sleep (< 6 hours)
    const poorSleep = Math.random() < 0.1; // 10% chance
    const sleepDuration = poorSleep ? 4 + Math.random() * 2 : baseSleep;
    
    await db.insert(recoveryLogs).values({
      date,
      sleep_duration_hr: parseFloat(sleepDuration.toFixed(1)),
      sleep_quality: sleepQuality,
      bedtime: poorSleep ? "01:30" : "23:00",
      wake_time: poorSleep ? "06:00" : "07:00",
      hrv: Math.floor(poorSleep ? 40 + Math.random() * 20 : 50 + Math.random() * 30), // Lower HRV on poor sleep
      resting_hr: Math.floor(poorSleep ? 60 + Math.random() * 15 : 55 + Math.random() * 10), // Higher HR on poor sleep
      energy_level: energyLevel,
      muscle_soreness: soreness,
      stress_level: stressLevel,
      notes: poorSleep ? "Poor sleep night" : null,
    });
    
    console.log(`  ✅ Completed ${date}`);
  }
  
  console.log("\n🎉 Comprehensive dummy data added successfully!");
  console.log("📊 Summary:");
  console.log(`  - ${dates.length} days of weight logs (30 days)`);
  console.log(`  - 1 InBody scan`);
  console.log(`  - ${dates.length * USER_PROFILE.supplements.length} supplement logs`);
  console.log(`  - ${prData.length} personal records`);
  console.log(`  - ${dates.length} days of nutrition data (with variability)`);
  console.log(`  - ~${Math.floor(dates.length * 0.85)} workout sessions (Mon-Sat, ~5% missed)`);
  console.log(`  - ${dates.length} recovery logs (with variability)`);
  console.log("\n✨ Includes edge cases:");
  console.log("  - Skipped breakfasts (~10%)");
  console.log("  - Light eating days (~15%)");
  console.log("  - Cheat days (~5%)");
  console.log("  - Missed workouts (~5%)");
  console.log("  - Poor sleep nights (~10%)");
  console.log("  - Weight progression over time");
  console.log("  - Rep and RPE variability");
}
