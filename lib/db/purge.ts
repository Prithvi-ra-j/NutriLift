import { sqlite } from "./client";
import { inTx } from "./tx";
import { nowUnix } from "../time/clock";
import { buildPersonalRecordExternalId } from "../integrations/life-os/recordMappers";

const RETENTION_SECONDS = 30 * 24 * 60 * 60;

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
    const bodyStats = await sqlite.getAllAsync<{ id: string }>(
      "SELECT id FROM body_stats WHERE deleted_at IS NOT NULL AND deleted_at < ?",
      [cutoff],
    );
    let purged = 0;
    for (const row of bodyStats) {
      const externalId = `nutrilift:body_stat:${row.id}`;
      if (!(await hasUploadedDeletion(externalId))) continue;
      const result = await sqlite.runAsync(
        "DELETE FROM body_stats WHERE id = ? AND deleted_at IS NOT NULL AND deleted_at < ?",
        [row.id, cutoff],
      );
      purged += result.changes;
      await sqlite.runAsync("DELETE FROM sync_uploaded_deletions WHERE external_id = ?", [externalId]);
    }

    const personalRecords = await sqlite.getAllAsync<{ exercise_name: string }>(
      "SELECT exercise_name FROM personal_records WHERE deleted_at IS NOT NULL AND deleted_at < ?",
      [cutoff],
    );
    for (const record of personalRecords) {
      const externalId = buildPersonalRecordExternalId(record.exercise_name);
      if (!(await hasUploadedDeletion(externalId))) continue;
      const result = await sqlite.runAsync(
        `DELETE FROM personal_records
         WHERE exercise_name = ? AND deleted_at IS NOT NULL AND deleted_at < ?`,
        [record.exercise_name, cutoff],
      );
      purged += result.changes;
      await sqlite.runAsync("DELETE FROM sync_uploaded_deletions WHERE external_id = ?", [externalId]);
    }
    return purged;
  });
}
