import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { domainEvents } from "../../db/schema";
import { getPendingDerivedStateInvalidations, markDerivedStateInvalidationProcessed } from "../../db/queries/domain-events";

/**
 * Consume invalidations for read-through projections. Canonical writes already
 * refresh persisted daily totals transactionally; Coach/Progress/history views
 * query source-of-truth records on demand, so acknowledging these entries is
 * safe only after confirming the originating event still exists.
 *
 * Sync invalidations are intentionally left pending until the sync pipeline
 * receives a valid remote acknowledgement.
 */
export async function processDerivedStateInvalidations(limit = 250): Promise<{ processed: number; pendingSync: number }> {
  const pending = await getPendingDerivedStateInvalidations(db, limit);
  let processed = 0;
  for (const invalidation of pending) {
    if (invalidation.projection_key.startsWith("sync.")) continue;
    const events = await db.select().from(domainEvents).where(eq(domainEvents.id, invalidation.event_id)).limit(1);
    if (!events[0]) continue;
    await markDerivedStateInvalidationProcessed(db, invalidation.id);
    processed += 1;
  }
  const remaining = await getPendingDerivedStateInvalidations(db, 500);
  return { processed, pendingSync: remaining.filter((item) => item.projection_key.startsWith("sync.")).length };
}
