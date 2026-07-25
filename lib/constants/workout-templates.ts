// Pre-defined exercise templates for each workout split

export interface ExerciseTemplate {
  name: string;
  muscle_group: string;
  equipment: string;
  sets: number;
  reps: string;
  notes?: string;
}

export const WORKOUT_TEMPLATES: Record<string, ExerciseTemplate[]> = {
  "Push A": [
    { name: "Bench Press", muscle_group: "chest", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Incline Dumbbell Press", muscle_group: "chest", equipment: "dumbbell", sets: 3, reps: "10-12" },
    { name: "Overhead Press", muscle_group: "shoulders", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Lateral Raises", muscle_group: "shoulders", equipment: "dumbbell", sets: 3, reps: "12-15" },
    { name: "Tricep Dips", muscle_group: "triceps", equipment: "bodyweight", sets: 3, reps: "10-12" },
    { name: "Tricep Pushdowns", muscle_group: "triceps", equipment: "cable", sets: 3, reps: "12-15" },
  ],
  
  "Push B": [
    { name: "Incline Barbell Press", muscle_group: "chest", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Flat Dumbbell Press", muscle_group: "chest", equipment: "dumbbell", sets: 3, reps: "10-12" },
    { name: "Dumbbell Shoulder Press", muscle_group: "shoulders", equipment: "dumbbell", sets: 3, reps: "8-10" },
    { name: "Front Raises", muscle_group: "shoulders", equipment: "dumbbell", sets: 3, reps: "12-15" },
    { name: "Close Grip Bench Press", muscle_group: "triceps", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Overhead Tricep Extension", muscle_group: "triceps", equipment: "dumbbell", sets: 3, reps: "12-15" },
  ],

  "Pull A": [
    { name: "Deadlift", muscle_group: "back", equipment: "barbell", sets: 3, reps: "5-8" },
    { name: "Pull-ups", muscle_group: "back", equipment: "bodyweight", sets: 3, reps: "8-12" },
    { name: "Barbell Rows", muscle_group: "back", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Face Pulls", muscle_group: "rear delts", equipment: "cable", sets: 3, reps: "15-20" },
    { name: "Barbell Curls", muscle_group: "biceps", equipment: "barbell", sets: 3, reps: "10-12" },
    { name: "Hammer Curls", muscle_group: "biceps", equipment: "dumbbell", sets: 3, reps: "12-15" },
  ],

  "Pull B": [
    { name: "Rack Pulls", muscle_group: "back", equipment: "barbell", sets: 3, reps: "6-8" },
    { name: "Lat Pulldowns", muscle_group: "back", equipment: "cable", sets: 3, reps: "10-12" },
    { name: "Seated Cable Rows", muscle_group: "back", equipment: "cable", sets: 3, reps: "10-12" },
    { name: "Reverse Flyes", muscle_group: "rear delts", equipment: "dumbbell", sets: 3, reps: "15-20" },
    { name: "Dumbbell Curls", muscle_group: "biceps", equipment: "dumbbell", sets: 3, reps: "10-12" },
    { name: "Preacher Curls", muscle_group: "biceps", equipment: "cable", sets: 3, reps: "12-15" },
  ],

  "Legs A": [
    { name: "Squat", muscle_group: "quads", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Leg Press", muscle_group: "quads", equipment: "machine", sets: 3, reps: "10-12" },
    { name: "Romanian Deadlift", muscle_group: "hamstrings", equipment: "barbell", sets: 3, reps: "10-12" },
    { name: "Leg Curls", muscle_group: "hamstrings", equipment: "machine", sets: 3, reps: "12-15" },
    { name: "Calf Raises", muscle_group: "calves", equipment: "machine", sets: 4, reps: "15-20" },
    { name: "Leg Extensions", muscle_group: "quads", equipment: "machine", sets: 3, reps: "12-15" },
  ],

  "Legs B": [
    { name: "Front Squat", muscle_group: "quads", equipment: "barbell", sets: 3, reps: "8-10" },
    { name: "Bulgarian Split Squats", muscle_group: "quads", equipment: "dumbbell", sets: 3, reps: "10-12" },
    { name: "Stiff Leg Deadlift", muscle_group: "hamstrings", equipment: "barbell", sets: 3, reps: "10-12" },
    { name: "Lying Leg Curls", muscle_group: "hamstrings", equipment: "machine", sets: 3, reps: "12-15" },
    { name: "Seated Calf Raises", muscle_group: "calves", equipment: "machine", sets: 4, reps: "15-20" },
    { name: "Hack Squat", muscle_group: "quads", equipment: "machine", sets: 3, reps: "10-12" },
  ],

  "Cardio": [],
  "Rest": [],
};

export function getTemplateForDayType(dayType: string): ExerciseTemplate[] {
  return WORKOUT_TEMPLATES[dayType] || [];
}
