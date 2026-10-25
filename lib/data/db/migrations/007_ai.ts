import type { MigrationDatabase } from "./runner";

export async function up(db: MigrationDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE ai_conversations
      ADD COLUMN prompt_version TEXT NOT NULL DEFAULT 'legacy@0';

    CREATE TABLE IF NOT EXISTS ai_summary_cache (
      period TEXT PRIMARY KEY NOT NULL,
      input_hash TEXT NOT NULL,
      output_text TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
