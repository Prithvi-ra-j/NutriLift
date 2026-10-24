import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { appSettings } from "../db/schema";
import { inTx } from "../db/tx";
import { nowIso } from "../time/clock";

export async function getAppSetting(key: string): Promise<string | null> {
  const [setting] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return setting?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await setAppSettings({ [key]: value });
}

export async function setAppSettings(settings: Record<string, string>): Promise<void> {
  const updatedAt = nowIso();
  await inTx(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db
        .insert(appSettings)
        .values({ key, value, updated_at: updatedAt })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updated_at: updatedAt },
        });
    }
  });
}
