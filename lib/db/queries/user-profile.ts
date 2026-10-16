import { eq } from "drizzle-orm";
import { db } from "../client";
import { userProfile } from "../schema";
import { appendDomainEvent } from "./domain-events";
import { mergeUserProfileFields, validateUserProfile, type UserProfileInput, type ProfileSex } from "../../profile/profile-validation";

export type { UserProfileInput, ProfileSex, ProfileValidationResult } from "../../profile/profile-validation";
export { validateUserProfile } from "../../profile/profile-validation";

export interface PersistedUserProfile {
  id: number;
  age: number | null;
  sex: ProfileSex | null;
  height_cm: number | null;
  training_start_date: string | null;
  current_split: string | null;
  training_phase: string | null;
  cardio: string | null;
  equipment: string | null;
  physique_goal: string | null;
  body_fat_goal_pct: number | null;
  body_fat_goal_date: string | null;
  updated_at: string;
}

export async function getUserProfile(executor: any = db): Promise<PersistedUserProfile | null> {
  const rows = await executor.select().from(userProfile).where(eq(userProfile.id, 1)).limit(1);
  return (rows[0] as PersistedUserProfile | undefined) ?? null;
}

export async function updateUserProfile(patch: UserProfileInput): Promise<PersistedUserProfile> {
  let savedProfile: PersistedUserProfile | null = null;

  // Read/merge/validate/write inside one transaction so concurrent partial
  // edits cannot overwrite fields they did not intend to change.
  await db.transaction(async (tx: any) => {
    const existing = await getUserProfile(tx);
    const merged = mergeUserProfileFields(existing, patch);
    const next = {
      id: 1,
      age: null,
      sex: null,
      height_cm: null,
      training_start_date: null,
      current_split: null,
      training_phase: null,
      cardio: null,
      equipment: null,
      physique_goal: null,
      body_fat_goal_pct: null,
      body_fat_goal_date: null,
      ...merged,
      updated_at: new Date().toISOString(),
    } as PersistedUserProfile;

    const validation = validateUserProfile(next);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    if (next.training_start_date === "") next.training_start_date = null;
    for (const key of ["current_split", "training_phase", "cardio", "equipment", "physique_goal"] as const) {
      if (next[key] != null) next[key] = next[key]!.trim();
    }

    await tx.insert(userProfile).values(next).onConflictDoUpdate({
      target: userProfile.id,
      set: {
        age: next.age, sex: next.sex, height_cm: next.height_cm,
        training_start_date: next.training_start_date, current_split: next.current_split,
        training_phase: next.training_phase, cardio: next.cardio, equipment: next.equipment,
        physique_goal: next.physique_goal, body_fat_goal_pct: next.body_fat_goal_pct,
        body_fat_goal_date: next.body_fat_goal_date, updated_at: next.updated_at,
      },
    });
    const version = Date.now();
    await appendDomainEvent(tx, {
      id: `user-profile:1:${version}`,
      eventType: "profile.updated",
      entityType: "user_profile",
      entityId: "1",
      entityVersion: version,
      occurredAt: next.updated_at,
      metadata: { changedFields: Object.keys(patch).filter((key) => (patch as Record<string, unknown>)[key] !== undefined) },
    });
    savedProfile = next;
  });

  if (!savedProfile) throw new Error("Profile update did not commit.");
  return savedProfile;
}
