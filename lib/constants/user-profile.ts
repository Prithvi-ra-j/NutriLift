import { DEFAULT_NUTRITION_TARGETS } from "../nutrition/target-validation";

/**
 * Generic, non-personal compatibility defaults for legacy consumers and demo
 * seeding only. Runtime profile/targets must come from SQLite repositories.
 */
export const USER_PROFILE = {
  name: "User",
  age: 30,
  sex: "prefer_not_to_say" as const,
  height_cm: 170,
  training_start_date: "",

  // Synthetic demo-only values; never used as a live user's latest measurement.
  inbody: {
    weight_lb: 154.3,
    weight_kg: 70,
    body_fat_pct: 20,
    body_fat_mass_lb: 30.9,
    skeletal_muscle_mass_lb: 66.1,
    inbody_score: 70,
    bmi: 24.2,
  },

  targets: {
    calories: DEFAULT_NUTRITION_TARGETS.calories,
    protein_g: DEFAULT_NUTRITION_TARGETS.protein_g,
    carbs_g: DEFAULT_NUTRITION_TARGETS.carbs_g,
    fat_g: DEFAULT_NUTRITION_TARGETS.fat_g,
    body_fat_pct_dec2026: null,
    physique_goal: "General fitness",
  },

  // Personal notes and supplement plans are user-owned; never seed them from source.
  structural_notes: [] as string[],
  training: {
    current_split: "Flexible",
    phase: "General fitness",
    cardio: "",
    equipment: "Gym or bodyweight",
  },
  supplements: [] as Array<{ name: string; dose: string; timing: string }>,
} as const;

export type UserProfile = typeof USER_PROFILE;
