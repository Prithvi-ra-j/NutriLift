import { isDatabaseBackupExportable } from "./exportAll";
import { sqlite } from "./db/client";

export type MigrationDiagnostics = {
  databaseVersion: string;
  backupAvailable: boolean;
};

export async function getMigrationDiagnostics(): Promise<MigrationDiagnostics> {
  const version = await sqlite.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const quickCheck = await sqlite.getFirstAsync<{ quick_check: string }>(
    "PRAGMA quick_check",
  );
  const databaseVersion = String(version?.user_version ?? "Unavailable");
  if (quickCheck?.quick_check !== "ok") {
    return { databaseVersion, backupAvailable: false };
  }

  return {
    databaseVersion,
    backupAvailable: await isDatabaseBackupExportable(),
  };
}
