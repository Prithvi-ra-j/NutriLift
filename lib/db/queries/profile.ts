import { eq } from "drizzle-orm";
import { db } from "../client";
import { userProfile, type NewUserProfileRow, type UserProfileRow } from "../schema";

export async function getUserProfile(): Promise<UserProfileRow | null> {
  const rows = await db.select().from(userProfile).where(eq(userProfile.id, "default"));
  return rows[0] ?? null;
}

export async function upsertUserProfile(profile: Omit<NewUserProfileRow, "id" | "created_at" | "updated_at">): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getUserProfile();
  if (existing) {
    await db.update(userProfile).set({ ...profile, updated_at: now }).where(eq(userProfile.id, "default"));
  } else {
    await db.insert(userProfile).values({ ...profile, id: "default", created_at: now, updated_at: now });
  }
}
