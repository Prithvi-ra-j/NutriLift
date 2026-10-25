import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { sqlite } from "../db/client";
import { inTx, runExclusive } from "../db/tx";
import { nowIso } from "../time/clock";
import {
  buildSanitizedV0Fixture,
  type MigrationFixtureSources,
} from "./sanitizedMigrationFixture";

const EXPORT_TABLES = [
  "food_logs",
  "daily_nutrition",
  "workout_sessions",
  "exercise_logs",
  "set_logs",
  "personal_records",
  "body_stats",
  "recovery_logs",
  "supplement_logs",
  "monthly_reports",
  "ai_conversations",
  "barcode_cache",
  "personal_foods",
  "personal_foods_edit_history",
  "weekly_summaries",
  "quarterly_summaries",
  "yearly_summaries",
  "sync_tombstones",
  "sync_queue",
  "sync_checkpoint",
  "sync_uploaded_deletions",
  "sync_state",
  "custom_exercises",
  "user_profile",
  "target_history",
  "app_settings",
  "ai_summary_cache",
] as const;

export async function exportDatabaseBackup(): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error("NutriLift data export is available in the Android app.");
  }

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("The app's document directory is unavailable.");
  }

  const exportedAt = nowIso();
  const tables = await inTx(async () => {
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const table of EXPORT_TABLES) {
      data[table] = await sqlite.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM "${table}"`,
      );
    }
    return data;
  });

  const filename = `nutrilift-data-${exportedAt.replace(/[:.]/g, "-")}.json`;
  const uri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(
    uri,
    JSON.stringify({ formatVersion: 1, exportedAt, tables }, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Export NutriLift data",
    UTI: "public.json",
  });

  return uri;
}

export async function exportSanitizedMigrationFixture(): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error("Sanitized migration fixtures are available in the Android app.");
  }

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("The app's document directory is unavailable.");
  }

  const sources = await runExclusive(async () => {
    const hasRows = async (table: string): Promise<boolean> => {
      const row = await sqlite.getFirstAsync<{ present: number }>(
        `SELECT EXISTS (SELECT 1 FROM "${table}") AS present`,
      );
      return row?.present === 1;
    };

    const [
      foodLog,
      dailyNutrition,
      workoutSession,
      exerciseLog,
      setLog,
      recoveryLog,
      personalRecord,
    ] = await Promise.all([
      hasRows("food_logs"),
      hasRows("daily_nutrition"),
      hasRows("workout_sessions"),
      hasRows("exercise_logs"),
      hasRows("set_logs"),
      hasRows("recovery_logs"),
      hasRows("personal_records"),
    ]);

    const result: MigrationFixtureSources = {
      foodLog,
      dailyNutrition,
      workoutSession,
      exerciseLog,
      setLog,
      recoveryLog,
      personalRecord,
    };
    return result;
  });

  const fixture = buildSanitizedV0Fixture(sources);
  const uri = `${directory}nutrilift-v0-sanitized-fixture.sql`;
  await FileSystem.writeAsStringAsync(uri, fixture, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/sql",
    dialogTitle: "Export sanitized migration fixture",
    UTI: "public.data",
  });

  return uri;
}

export async function isDatabaseBackupExportable(): Promise<boolean> {
  const rows = await sqlite.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  const tableNames = new Set(rows.map((row) => row.name));
  return EXPORT_TABLES.every((table) => tableNames.has(table));
}
