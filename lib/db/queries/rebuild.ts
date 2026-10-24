import { eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { inTx } from "../tx";
import { nowIso } from "../../time/clock";
import {
  dailyNutrition,
  exerciseLogs,
  foodLogs,
  personalRecords,
  appSettings,
  workoutSessions,
} from "../schema";
import { recomputeDailyNutritionInTransaction } from "./nutrition";
import { recomputePRsForExercise, updateSessionVolume } from "./workout";
import { buildPersonalRecordExternalId } from "../../integrations/life-os/recordMappers";
import {
  clearTombstoneInTransaction,
} from "../../integrations/life-os/syncRepository";

export async function rebuildAllDerived(): Promise<void> {
  await inTx(async () => {
    const [foodDates, summaryDates, exerciseNames, sessions, existingRecords] = await Promise.all([
      db.select({ date: foodLogs.date }).from(foodLogs),
      db.select({ date: dailyNutrition.date }).from(dailyNutrition),
      db
        .selectDistinct({ exercise_name: exerciseLogs.exercise_name })
        .from(exerciseLogs)
        .where(isNull(exerciseLogs.deleted_at)),
      db.select({ id: workoutSessions.id }).from(workoutSessions).where(isNull(workoutSessions.deleted_at)),
      db.select().from(personalRecords),
    ]);

    const dates = new Set([
      ...foodDates.map((row) => row.date),
      ...summaryDates.map((row) => row.date),
    ]);
    for (const date of dates) {
      await recomputeDailyNutritionInTransaction(date);
    }

    const exerciseNameSet = new Set([
      ...exerciseNames.map((row) => row.exercise_name),
      ...existingRecords.map((row) => row.exercise_name),
    ]);
    for (const existing of existingRecords) {
      if (existing.deleted_at) continue;
      const oldExternalId = buildPersonalRecordExternalId(existing.exercise_name);
      await recomputePRsForExercise(existing.exercise_name);
      const [rebuilt] = await db
        .select({ achieved_date: personalRecords.achieved_date, deleted_at: personalRecords.deleted_at })
        .from(personalRecords)
        .where(eq(personalRecords.exercise_name, existing.exercise_name));
      if (!rebuilt || rebuilt.deleted_at) {
        continue;
      } else {
        await clearTombstoneInTransaction("personal_record", oldExternalId, oldExternalId);
      }
    }
    for (const name of exerciseNameSet) {
      if (existingRecords.some((record) => record.exercise_name === name && !record.deleted_at)) {
        continue;
      }
      await recomputePRsForExercise(name);
    }
    for (const session of sessions) {
      await updateSessionVolume(session.id);
    }
  });
}

export async function ensureDerivedDataForV5(): Promise<void> {
  const [marker] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "derived_rebuilt_v5"));
  if (marker?.value === "1") return;

  await rebuildAllDerived();
  await inTx(async () => {
    await db
      .insert(appSettings)
      .values({ key: "derived_rebuilt_v5", value: "1", updated_at: nowIso() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: "1", updated_at: nowIso() },
      });
  });
}
