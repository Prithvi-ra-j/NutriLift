import { sqlite } from "./client";
import { inTx } from "./tx";
import { nowUnix } from "../time/clock";
import { buildPersonalRecordExternalId } from "../integrations/life-os/recordMappers";

const RETENTION_SECONDS = 30 * 24 * 60 * 60;

type PurgeCandidate = {
  id: string;
  externalId: string;
};

const purgeableTables = [
  {
    name: "set_logs",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:set_log:${id}`,
  },
  {
    name: "exercise_logs",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:exercise_log:${id}`,
  },
  {
    name: "workout_sessions",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:workout_session:${id}`,
  },
  {
    name: "food_logs",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:food_log:${id}`,
  },
  {
    name: "supplement_logs",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:supplement_log:${id}`,
  },
  {
    name: "body_stats",
    idColumn: "id",
    externalId: (id: string) => `nutrilift:body_stat:${id}`,
  },
  {
    name: "personal_records",
    idColumn: "exercise_name",
    externalId: buildPersonalRecordExternalId,
  },
] as const;

async function hasUploadedDeletion(externalId: string): Promise<boolean> {
  const receipt = await sqlite.getFirstAsync<{ found: number }>(
    "SELECT 1 AS found FROM sync_uploaded_deletions WHERE external_id = ? LIMIT 1",
    [externalId],
  );
  if (receipt) return true;
  const queue = await sqlite.getFirstAsync<{ found: number }>(
    "SELECT 1 AS found FROM sync_queue WHERE external_id = ? AND state = 'uploaded' LIMIT 1",
    [externalId],
  );
  return Boolean(queue);
}

export async function purgeUploadedDeletedRows(): Promise<number> {
  const cutoff = new Date((nowUnix() - RETENTION_SECONDS) * 1000).toISOString();

  return inTx(async () => {
    let purged = 0;
    for (const table of purgeableTables) {
      const rows = await sqlite.getAllAsync<PurgeCandidate>(
        `SELECT "${table.idColumn}" AS id FROM "${table.name}"
         WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
        [cutoff],
      );
      for (const row of rows) {
        const externalId = table.externalId(row.id);
        if (!(await hasUploadedDeletion(externalId))) continue;
        const result = await sqlite.runAsync(
          `DELETE FROM "${table.name}"
           WHERE "${table.idColumn}" = ? AND deleted_at IS NOT NULL AND deleted_at < ?`,
          [row.id, cutoff],
        );
        purged += result.changes;
        await sqlite.runAsync(
          "DELETE FROM sync_uploaded_deletions WHERE external_id = ?",
          [externalId],
        );
      }
    }
    return purged;
  });
}
