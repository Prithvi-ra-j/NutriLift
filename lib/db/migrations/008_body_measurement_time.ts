import { addColumn, type MigrationDatabase } from "./runner";

export async function up(db: MigrationDatabase): Promise<void> {
  await addColumn(db, "body_stats", "measurement_time_of_day", "TEXT");
}
