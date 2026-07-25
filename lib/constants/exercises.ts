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

export interface Exercise {
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  day_types: DayType[];
}

export const EXERCISE_LIBRARY: Exercise[] = [
  // PUSH A
  { name: "Chest Press Machine", muscle_group: "chest", equipment: "machine", day_types: ["Push A"] },
  { name: "Incline Dumbbell Press", muscle_group: "chest", equipment: "dumbbell", day_types: ["Push A"] },
  { name: "Cable Fly", muscle_group: "chest", equipment: "cable", day_types: ["Push A"] },
  { name: "Shoulder Press Machine", muscle_group: "shoulders", equipment: "machine", day_types: ["Push A"] },
  { name: "Lateral Raise", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push A"] },
  { name: "Tricep Pushdown", muscle_group: "triceps", equipment: "cable", day_types: ["Push A"] },
  { name: "Overhead Tricep Extension", muscle_group: "triceps", equipment: "cable", day_types: ["Push A"] },

  // PUSH B
  { name: "Flat Barbell Bench Press", muscle_group: "chest", equipment: "barbell", day_types: ["Push B"] },
  { name: "Incline Machine Press", muscle_group: "chest", equipment: "machine", day_types: ["Push B"] },
  { name: "Pec Deck", muscle_group: "chest", equipment: "machine", day_types: ["Push B"] },
  { name: "Arnold Press", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push B"] },
  { name: "Front Raise", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Push B"] },
  { name: "Skull Crushers", muscle_group: "triceps", equipment: "barbell", day_types: ["Push B"] },
  { name: "Tricep Dips", muscle_group: "triceps", equipment: "bodyweight", day_types: ["Push B"] },

  // PULL A
  { name: "Lat Pulldown", muscle_group: "back", equipment: "cable", day_types: ["Pull A"] },
  { name: "Seated Cable Row", muscle_group: "back", equipment: "cable", day_types: ["Pull A"] },
  { name: "Machine Row", muscle_group: "back", equipment: "machine", day_types: ["Pull A"] },
  { name: "Face Pull", muscle_group: "shoulders", equipment: "cable", day_types: ["Pull A"] },
  { name: "Dumbbell Curl", muscle_group: "biceps", equipment: "dumbbell", day_types: ["Pull A"] },
  { name: "Hammer Curl", muscle_group: "biceps", equipment: "dumbbell", day_types: ["Pull A"] },

  // PULL B
  { name: "Pull-Up", muscle_group: "back", equipment: "bodyweight", day_types: ["Pull B"] },
  { name: "Barbell Row", muscle_group: "back", equipment: "barbell", day_types: ["Pull B"] },
  { name: "Single Arm Dumbbell Row", muscle_group: "back", equipment: "dumbbell", day_types: ["Pull B"] },
  { name: "Reverse Fly", muscle_group: "shoulders", equipment: "dumbbell", day_types: ["Pull B"] },
  { name: "Preacher Curl", muscle_group: "biceps", equipment: "machine", day_types: ["Pull B"] },
  { name: "Cable Curl", muscle_group: "biceps", equipment: "cable", day_types: ["Pull B"] },

  // LEGS A
  { name: "Leg Press", muscle_group: "quads", equipment: "machine", day_types: ["Legs A"] },
  { name: "Leg Extension", muscle_group: "quads", equipment: "machine", day_types: ["Legs A"] },
  { name: "Leg Curl", muscle_group: "hamstrings", equipment: "machine", day_types: ["Legs A"] },
  { name: "Hip Abduction Machine", muscle_group: "glutes", equipment: "machine", day_types: ["Legs A"] },
  { name: "Calf Raise Machine", muscle_group: "calves", equipment: "machine", day_types: ["Legs A"] },
  { name: "Glute Kickback", muscle_group: "glutes", equipment: "cable", day_types: ["Legs A"] },

  // LEGS B
  { name: "Hack Squat", muscle_group: "quads", equipment: "machine", day_types: ["Legs B"] },
  { name: "Romanian Deadlift", muscle_group: "hamstrings", equipment: "barbell", day_types: ["Legs B"] },
  { name: "Walking Lunges", muscle_group: "quads", equipment: "dumbbell", day_types: ["Legs B"] },
  { name: "Hip Thrust", muscle_group: "glutes", equipment: "barbell", day_types: ["Legs B"] },
  { name: "Seated Leg Curl", muscle_group: "hamstrings", equipment: "machine", day_types: ["Legs B"] },
  { name: "Standing Calf Raise", muscle_group: "calves", equipment: "machine", day_types: ["Legs B"] },

  // GENERAL
  { name: "Plank", muscle_group: "core", equipment: "bodyweight", day_types: ["Push A", "Push B", "Pull A", "Pull B", "Legs A", "Legs B"] },
  { name: "Cable Crunch", muscle_group: "core", equipment: "cable", day_types: ["Push A", "Push B", "Pull A", "Pull B", "Legs A", "Legs B"] },
  { name: "Deadlift", muscle_group: "back", equipment: "barbell", day_types: ["Pull A", "Pull B"] },
  { name: "Squat", muscle_group: "quads", equipment: "barbell", day_types: ["Legs A", "Legs B"] },

  // SUNDAY - CARDIO & RECOVERY
  { name: "Treadmill Run", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"] },
  { name: "Elliptical", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"] },
  { name: "Stationary Bike", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"] },
  { name: "Rowing Machine", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"] },
  { name: "Stair Climber", muscle_group: "cardio", equipment: "machine", day_types: ["Cardio"] },
  
  // STRETCHING
  { name: "Hamstring Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Quad Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Hip Flexor Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Shoulder Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Chest Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Cat-Cow Stretch", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Child's Pose", muscle_group: "flexibility", equipment: "bodyweight", day_types: ["Cardio"] },
  
  // STABILITY
  { name: "Single Leg Balance", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Bosu Ball Squats", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Stability Ball Plank", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Bird Dog", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Dead Bug", muscle_group: "stability", equipment: "bodyweight", day_types: ["Cardio"] },
  
  // MOBILITY
  { name: "Arm Circles", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Leg Swings", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Hip Circles", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Ankle Rolls", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "Thoracic Rotation", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
  { name: "World's Greatest Stretch", muscle_group: "mobility", equipment: "bodyweight", day_types: ["Cardio"] },
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
