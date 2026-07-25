export const USER_PROFILE = {
  name: "Prithvi",
  age: 23,
  sex: "male" as const,
  height_cm: 172.7, // 5'8"
  training_start_date: "2026-02-27",

  // Current InBody (April 9 2026)
  inbody: {
    weight_lb: 165.4,
    weight_kg: 75.0,
    body_fat_pct: 34.9,
    body_fat_mass_lb: 57.5,
    skeletal_muscle_mass_lb: 60.0,
    inbody_score: 58,
    bmi: 26.0,
  },

  // Targets
  targets: {
    calories: 2500,
    protein_g: 155,
    carbs_g: 240,
    fat_g: 65,
    body_fat_pct_dec2026: 22.0, // December 2026 goal
    physique_goal: "Toji Fushiguro aesthetic — lean, dense, athletic",
  },

  // Known structural issues (used in AI recommendations)
  structural_notes: [
    "Anterior pelvic tilt (APT)",
    "TFL overactivation / glute medius weakness",
    "Ankle dorsiflexion restriction",
    "Left knee pain — resolved by sequencing compound before isolation",
    "Wears hard-soled formal shoes daily — affects kinetic chain",
  ],

  // Training context
  training: {
    current_split: "PPL x2 (6-day)",
    phase: "Hypertrophy / Foundation",
    cardio: "Treadmill 20min post-workout, incline 8-10, speed 3.5-4.5",
    equipment: "Primarily machines, transitioning to free weights",
  },

  // Supplement stack
  supplements: [
    { name: "Creatine Monohydrate", dose: "5g", timing: "daily" },
    { name: "Whey Protein (ON Gold Standard)", dose: "1 scoop", timing: "post-workout" },
    { name: "Ashwagandha (Himalaya)", dose: "2 tablets", timing: "nightly with fat" },
    { name: "Vitamin D3 + K2 MK-7", dose: "per label", timing: "morning with fat" },
    { name: "Zinc Bisglycinate", dose: "per label", timing: "morning" },
    { name: "Copper Glycinate", dose: "per label", timing: "evening (spaced from zinc)" },
    { name: "Omega-3", dose: "per label", timing: "with meals" },
    { name: "Magnesium Glycinate", dose: "per label", timing: "nightly" },
    { name: "Brahmi/Bacopa (Himalaya)", dose: "per label", timing: "morning" },
    { name: "Saw Palmetto 320mg", dose: "320mg standardized", timing: "with fat" },
  ],
} as const;

export type UserProfile = typeof USER_PROFILE;
