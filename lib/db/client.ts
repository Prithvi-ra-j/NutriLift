import { Platform } from "react-native";
import { drizzle } from "drizzle-orm/expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import * as schema from "./schema";
import { migrations } from "./migrations";
import { migrate } from "./migrations/runner";

if (Platform.OS === "web") {
  throw new Error(
    "NutriLift requires SQLite and is not supported on the web platform.",
  );
}

const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");

export const sqlite: SQLiteDatabase = SQLite.openDatabaseSync("apex.db");
sqlite.execSync(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

export const db = drizzle(sqlite, { schema });

export async function runMigrations(): Promise<void> {
  await migrate(sqlite, migrations);
}
