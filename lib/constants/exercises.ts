export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "core"
  | "calves"
  | "cardio"
  | "flexibility"
  | "stability"
  | "mobility";

export type Equipment =
  | "machine"
  | "barbell"
  | "dumbbell"
  | "cable"
  | "bodyweight";

export type DayType =
  | "Push A"
  | "Pull A"
  | "Legs A"
  | "Push B"
  | "Pull B"
  | "Legs B"
  | "Marathon"
  | "Cardio"
  | "Rest";

/**
 * Determines which input fields are shown when logging a set:
 * - weight_reps    → Weight (kg) + Reps + RPE + Warmup toggle
 * - reps_only      → Reps/Count + RPE + Warmup toggle
 * - duration       → Duration (seconds) only
 * - distance_duration → Distance (km) + Duration (min)
 */
export type ExerciseType = "weight_reps" | "reps_only" | "duration" | "distance_duration";

export interface Exercise {
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  day_types: DayType[];
  exercise_type: ExerciseType;
}


export const EXERCISE_LIBRARY: Exercise[] = [
  // PUSH A
  { name: "Chest Press Machine", muscle_group: "chest", equipment: "machine", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Incline Dumbbell Press", muscle_group: "chest", equipment: "dumbbell", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Cable Fly", muscle_group: "chest", equipment: "cable", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Shoulder Press Machine", muscle_group: "shoulders", equipment: "machine", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Lateral Raise", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Tricep Pushdown", muscle_group: "triceps", equipment: "cable", day_types: ["Push A"], exercise_type: "weight_reps" },
  { name: "Overhead Tricep Extension", muscle_group: "triceps", equipment: "cable", day_types: ["Push A"], exercise_type: "weight_reps" },

  // PUSH B
  { name: "Flat Barbell Bench Press", muscle_group: "chest", equipment: "barbell", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Incline Machine Press", muscle_group: "chest", equipment: "machine", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Pec Deck", muscle_group: "chest", equipment: "machine", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Arnold Press", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Front Raise", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Skull Crushers", muscle_group: "triceps", equipment: "barbell", day_types: ["Push B"], exercise_type: "weight_reps" },
  { name: "Tricep Dips", muscle_group: "triceps", equipment: "bodyweight", day_types: ["Push B"], exercise_type: "reps_only" },

  // PULL A
  { name: "Lat Pulldown", muscle_group: "back", equipment: "cable", day_types: ["Pull A"], exercise_type: "weight_reps" },
  { name: "Seated Cable Row", muscle_group: "back", equipment: "cable", day_types: ["Pull A"], exercise_type: "weight_reps" },
  { name: "Machine Row", muscle_group: "back", equipment: "machine", day_types: ["Pull A"], exercise_type: "weight_reps" },
  { name: "Face Pull", muscle_group: "shoulders", equipment: "cable", day_types: ["Pull A"], exercise_type: "weight_reps" },
  { name: "Dumbbell Curl", muscle_group: "biceps", equipment: "dumbbell", day_types: ["Pull A"], exercise_type: "weight_reps" },
  { name: "Hammer Curl", muscle_group: "biceps", equipment: "dumbbell", day_types: ["Pull A"], exercise_type: "weight_reps" },

  // PULL B
  { name: "Pull-Up", muscle_group: "back", equipment: "bodyweight", day_types: ["Pull B"], exercise_type: "reps_only" },
  { name: "Barbell Row", muscle_group: "back", equipment: "barbell", day_types: ["Pull B"], exercise_type: "weight_reps" },
  { name: "Single Arm Dumbbell Row", muscle_group: "back", equipment: "dumbbell", day_types: ["Pull B"], exercise_type: "weight_reps" },
  { name: "Reverse Fly", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Pull B"], exercise_type: "weight_reps" },
  { name: "Preacher Curl", muscle_group: "biceps", equipment: "machine", day_types: ["Pull B"], exercise_type: "weight_reps" },
  { name: "Cable Curl", muscle_group: "biceps", equipment: "cable", day_types: ["Pull B"], exercise_type: "weight_reps" },

  // LEGS A
  { name: "Leg Press", muscle_group: "quads", equipment: "machine", day_types: ["Legs A"], exercise_type: "weight_reps" },
  { name: "Leg Extension", muscle_group: "quads", equipment: "machine", day_types: ["Legs A"], exercise_type: "weight_reps" },
  { name: "Leg Curl", muscle_group: "hamstrings", equipment: "machine", day_types: ["Legs A"], exercise_type: "weight_reps" },
  { name: "Hip Abduction Machine", muscle_group: "glutes", equipment: "machine", day_types: ["Legs A"], exercise_type: "weight_reps" },
  { name: "Calf Raise Machine", muscle_group: "calves", equipment: "machine", day_types: ["Legs A"], exercise_type: "weight_reps" },
  { name: "Glute Kickback", muscle_group: "glutes", equipment: "cable", day_types: ["Legs A"], exercise_type: "weight_reps" },

  // LEGS B
  { name: "Hack Squat", muscle_group: "quads", equipment: "machine", day_types: ["Legs B"], exercise_type: "weight_reps" },
  { name: "Romanian Deadlift", muscle_group: "hamstrings", equipment: "barbell", day_types: ["Legs B"], exercise_type: "weight_reps" },
  { name: "Walking Lunges", muscle_group: "quads", equipment: "dumbbell", day_types: ["Legs B"], exercise_type: "weight_reps" },
  { name: "Hip Thrust", muscle_group: "glutes", equipment: "barbell", day_types: ["Legs B"], exercise_type: "weight_reps" },
  { name: "Seated Leg Curl", muscle_group: "hamstrings", equipment: "machine", day_types: ["Legs B"], exercise_type: "weight_reps" },
  { name: "Standing Calf Raise", muscle_group: "calves", equipment: "machine", day_types: ["Legs B"], exercise_type: "weight_reps" },

  // GENERAL
  { name: "Plank", muscle_group: "core", equipment: "bodyweight", day_types: ["Push A", "Push B", "Pull A", "Pull B", "Legs A", "Legs B"], exercise_type: "duration" },
  { name: "Cable Crunch", muscle_group: "core", equipment: "cable", day_types: ["Push A", "Push B", "Pull A", "Pull B", "Legs A", "Legs B"], exercise_type: "weight_reps" },
  { name: "Deadlift", muscle_group: "back", equipment: "barbell", day_types: ["Pull A", "Pull B"], exercise_type: "weight_reps" },
  { name: "Squat", muscle_group: "quads", equipment: "barbell", day_types: ["Legs A", "Legs B"], exercise_type: "weight_reps" },

  // SUNDAY - CARDIO & RECOVERY
  { name: "Treadmill Run", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"], exercise_type: "distance_duration" },
  { name: "Elliptical", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"], exercise_type: "distance_duration" },
  { name: "Stationary Bike", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"], exercise_type: "distance_duration" },
  { name: "Rowing Machine", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"], exercise_type: "distance_duration" },
  { name: "Stair Climber", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"], exercise_type: "duration" },
  
  // STRETCHING
  { name: "Hamstring Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Quad Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Hip Flexor Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Shoulder Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Chest Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Cat-Cow Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Child's Pose", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  
  // STABILITY
  { name: "Single Leg Balance", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Bosu Ball Squats", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Stability Ball Plank", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
  { name: "Bird Dog", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Dead Bug", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  
  // MOBILITY
  { name: "Arm Circles", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Leg Swings", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Hip Circles", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Ankle Rolls", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "Thoracic Rotation", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "reps_only" },
  { name: "World's Greatest Stretch", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"], exercise_type: "duration" },
];

export const DAY_TYPES: DayType[] = [
  "Push A",
  "Pull A",
  "Legs A",
  "Push B",
  "Pull B",
  "Legs B",
  "Cardio",
  "Rest",
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "core",
  "calves",
  "cardio",
  "flexibility",
  "stability",
  "mobility",
];
