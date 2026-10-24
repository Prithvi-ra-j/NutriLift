import { desc, eq, lte } from "drizzle-orm";
import { DEFAULT_TARGETS } from "../constants/defaults";
import { db } from "../db/client";
import { inTx } from "../db/tx";
import {
  targetHistory,
  userProfile,
  type NewTargetHistory,
  type NewUserProfile,
  type UserProfile,
} from "../db/schema";
import { nowIso } from "../time/clock";

export type ProfileInput = Omit<NewUserProfile, "id" | "updated_at">;

export async function getProfile(): Promise<UserProfile | null> {
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, "me"))
    .limit(1);
  return profile ?? null;
}

export async function saveProfile(profile: ProfileInput): Promise<void> {
  const record: NewUserProfile = {
    ...profile,
    id: "me",
    updated_at: nowIso(),
  };

  await inTx(async () => {
    await db
      .insert(userProfile)
      .values(record)
      .onConflictDoUpdate({
        target: userProfile.id,
        set: {
          display_name: record.display_name,
          sex: record.sex,
          birth_year: record.birth_year,
          height_cm: record.height_cm,
          goal_text: record.goal_text,
          coach_notes: record.coach_notes,
          updated_at: record.updated_at,
        },
      });
  });
}

export async function getTargetsForDate(
  date: string,
): Promise<NewTargetHistory> {
  const [targets] = await db
    .select()
    .from(targetHistory)
    .where(lte(targetHistory.effective_from, date))
    .orderBy(desc(targetHistory.effective_from))
    .limit(1);

  return targets ?? {
    effective_from: date,
    ...DEFAULT_TARGETS,
  };
}

export async function saveTargets(
  targets: NewTargetHistory,
): Promise<void> {
  await inTx(async () => {
    await db
      .insert(targetHistory)
      .values(targets)
      .onConflictDoUpdate({
        target: targetHistory.effective_from,
        set: {
          calories: targets.calories,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
        },
      });
  });
}
