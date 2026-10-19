/**
 * Non-personal defaults only. Runtime user identity, measurements, goals and
 * supplement lists must be loaded from persisted profile data after Section 3.
 * Keep this compatibility type until all consumers are migrated.
 */
export const USER_PROFILE = {
  name: "User",
  age: 30,
  sex: "prefer_not_to_say" as const,
  height_cm: 170,
  training_start_date: "",
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
    calories: 2200,
    protein_g: 130,
    carbs_g: 250,
    fat_g: 70,
    body_fat_pct_dec2026: null,
    physique_goal: "General fitness",
  },
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
