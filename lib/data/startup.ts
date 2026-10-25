import { runMigrations } from "./db/client";
import { purgeUploadedDeletedRows } from "./db/purge";
import { ensureDerivedDataForV5 } from "./repositories/rebuild";
import { purgeUploadedQueue } from "../integrations/life-os/syncRepository";

export async function initializeDataLayer(): Promise<void> {
  await runMigrations();
  await ensureDerivedDataForV5();
  await purgeUploadedDeletedRows();
  await purgeUploadedQueue();
}
