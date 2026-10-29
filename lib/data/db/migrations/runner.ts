import type { SQLiteDatabase } from "expo-sqlite";

export type Migration = {
  version: number;
  name: string;
  up: (db: MigrationDatabase) => Promise<void>;
};

export type MigrationDatabase = Pick<
  SQLiteDatabase,
  "execAsync" | "getAllAsync" | "getFirstAsync" | "withTransactionAsync"
>;

export async function migrate(
  db: MigrationDatabase,
  migrations: Migration[],
): Promise<void> {
  if (migrations.length === 0) {
    throw new Error("At least one database migration is required.");
  }

  for (let index = 0; index < migrations.length; index += 1) {
    const migration = migrations[index];
    if (!migration || migration.version !== index + 1) {
      throw new Error("Database migrations must have contiguous versions starting at 1.");
    }
  }

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const current = row?.user_version ?? 0;
  const latestMigration = migrations.at(-1);
  if (!latestMigration) {
    throw new Error("At least one database migration is required.");
  }
  const latest = latestMigration.version;

  if (current > latest) {
    throw new Error(
      `Database v${current} is newer than this app (v${latest}). Update the app.`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= current) continue;

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

export async function hasColumn(
  db: MigrationDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  assertIdentifier(table);
  assertIdentifier(column);
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info("${table}")`,
  );
  return columns.some((entry) => entry.name === column);
}

export async function addColumn(
  db: MigrationDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  assertIdentifier(table);
  assertIdentifier(column);
  if (
    ![
      "TEXT",
      "INTEGER",
      "REAL",
      "INTEGER NOT NULL DEFAULT 0",
      "TEXT NOT NULL DEFAULT 'found'",
    ].includes(type)
  ) {
    throw new Error(`Unsupported SQLite column type: ${type}`);
  }
  if (!(await hasColumn(db, table, column))) {
    await db.execAsync(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
  }
}

function assertIdentifier(identifier: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQLite identifier: ${identifier}`);
  }
}
