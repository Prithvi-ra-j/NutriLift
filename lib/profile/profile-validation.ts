import { fromLocalDateKey } from "../utils/local-date";

export type ProfileSex = "female" | "male" | "other" | "prefer_not_to_say";

export interface UserProfileInput {
  age?: number | null;
  sex?: ProfileSex | null;
  height_cm?: number | null;
  training_start_date?: string | null;
  current_split?: string | null;
  training_phase?: string | null;
  cardio?: string | null;
  equipment?: string | null;
  physique_goal?: string | null;
}

export interface ProfileValidationResult { valid: boolean; errors: string[]; }

const TEXT_FIELDS = ["current_split", "training_phase", "cardio", "equipment", "physique_goal"] as const;

export function validateUserProfile(profile: UserProfileInput): ProfileValidationResult {
  const errors: string[] = [];
  if (profile.age != null && (!Number.isInteger(profile.age) || profile.age < 13 || profile.age > 110)) {
    errors.push("Age must be a whole number between 13 and 110.");
  }
  if (profile.sex != null && !["female", "male", "other", "prefer_not_to_say"].includes(profile.sex)) {
    errors.push("Sex must be female, male, other, or prefer_not_to_say.");
  }
  if (profile.height_cm != null && (!Number.isFinite(profile.height_cm) || profile.height_cm < 100 || profile.height_cm > 250)) {
    errors.push("Height must be between 100 and 250 cm.");
  }
  if (profile.training_start_date != null && profile.training_start_date !== "") {
    try { fromLocalDateKey(profile.training_start_date); }
    catch { errors.push("Training start date must be a real YYYY-MM-DD date."); }
  }
  for (const key of TEXT_FIELDS) {
    const value = profile[key];
    if (value != null && (typeof value !== "string" || value.trim().length > 160)) {
      errors.push(`${key.replaceAll("_", " ")} must be 160 characters or fewer.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
