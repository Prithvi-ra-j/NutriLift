import { and, desc, eq, isNull } from "drizzle-orm";
import { domainEvents, derivedStateInvalidations } from "../schema";
import { redactSensitiveFields } from "../../observability/redaction";

export type DomainEventType =
  | "nutrition.food.created" | "nutrition.food.updated" | "nutrition.food.deleted"
  | "nutrition.targets.changed" | "nutrition.day.reviewed"
  | "workout.session.started" | "workout.session.updated" | "workout.session.completed" | "workout.session.cancelled"
  | "workout.set.recorded" | "workout.set.updated" | "workout.set.deleted"
  | "recovery.check-in.saved" | "recovery.supplement.updated"
  | "body.measurement.saved" | "body.measurement.deleted";

export interface AppendDomainEventInput {
  id: string;
  eventType: DomainEventType;
  entityType: string;
  entityId: string;
  entityVersion: number;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

const INVALIDATION_MAP: Readonly<Record<DomainEventType, readonly string[]>> = {
  "nutrition.food.created": ["nutrition.daily-summary", "nutrition.completeness", "nutrition.history", "coach.recommendations", "sync.food-logs"],
  "nutrition.food.updated": ["nutrition.daily-summary", "nutrition.completeness", "nutrition.history", "coach.recommendations", "sync.food-logs"],
  "nutrition.food.deleted": ["nutrition.daily-summary", "nutrition.completeness", "nutrition.history", "coach.recommendations", "sync.food-logs"],
  "nutrition.targets.changed": ["nutrition.daily-summary", "nutrition.history", "coach.recommendations"],
  "nutrition.day.reviewed": ["nutrition.completeness", "nutrition.history", "coach.recommendations"],
  "workout.session.started": ["workout.session-summary", "workout.history", "coach.recommendations", "sync.workouts"],
  "workout.session.updated": ["workout.session-summary", "workout.history", "workout.personal-records", "coach.recommendations", "sync.workouts"],
  "workout.session.completed": ["workout.session-summary", "workout.history", "workout.personal-records", "coach.recommendations", "sync.workouts"],
  "workout.session.cancelled": ["workout.session-summary", "workout.history", "coach.recommendations", "sync.workouts"],
  "workout.set.recorded": ["workout.session-summary", "workout.history", "workout.personal-records", "coach.recommendations", "sync.workouts"],
  "workout.set.updated": ["workout.session-summary", "workout.history", "workout.personal-records", "coach.recommendations", "sync.workouts"],
  "workout.set.deleted": ["workout.session-summary", "workout.history", "workout.personal-records", "coach.recommendations", "sync.workouts"],
  "recovery.check-in.saved": ["recovery.summary", "recovery.history", "coach.recommendations", "sync.recovery"],
  "recovery.supplement.updated": ["recovery.supplement-adherence", "recovery.history", "sync.recovery"],
  "body.measurement.saved": ["progress.body-composition", "progress.measurement-trends", "coach.recommendations", "sync.body-measurements"],
  "body.measurement.deleted": ["progress.body-composition", "progress.measurement-trends", "coach.recommendations", "sync.body-measurements"],
};

export function getInvalidatedProjectionKeys(eventType: DomainEventType): string[] {
  const keys = INVALIDATION_MAP[eventType];
  if (!keys) throw new Error(`No invalidation policy is registered for domain event: ${eventType}`);
  return [...keys];
}

/**
 * Persist a versioned, metadata-only event in the same transaction as the
 * canonical domain write. It never stores free-form notes or raw health payloads.
 */
export async function appendDomainEvent(tx: any, input: AppendDomainEventInput): Promise<void> {
  if (!input.id.trim() || !input.entityType.trim() || !input.entityId.trim()) {
    throw new Error("Domain event and entity identity are required.");
  }
  if (!Number.isInteger(input.entityVersion) || input.entityVersion < 1) {
    throw new Error("Domain event entityVersion must be a positive integer.");
  }
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error("Domain event occurredAt must be a valid timestamp.");

  const existingRows = await tx.select().from(domainEvents).where(eq(domainEvents.id, input.id)).limit(1);
  const existing = existingRows[0];
  if (existing) {
    if (existing.event_type !== input.eventType || existing.entity_type !== input.entityType || existing.entity_id !== input.entityId) {
      throw new Error("Domain event idempotency conflict: the event id is already bound to a different change.");
    }
    await invalidateDerivedState(tx, { eventId: input.id, eventType: input.eventType, occurredAt: existing.occurred_at });
    return;
  }

  const previousRows = await tx.select().from(domainEvents)
    .where(and(eq(domainEvents.entity_type, input.entityType), eq(domainEvents.entity_id, input.entityId)))
    .orderBy(desc(domainEvents.entity_version)).limit(1);
  const previousVersion = Number(previousRows[0]?.entity_version ?? 0);
  const entityVersion = Math.max(input.entityVersion, previousVersion + 1);
  const metadata = redactSensitiveFields(input.metadata ?? {});
  const event = {
    id: input.id,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_version: entityVersion,
    schema_version: 1,
    occurred_at: occurredAt,
    metadata_json: JSON.stringify(metadata),
  };

  await tx.insert(domainEvents).values(event).onConflictDoNothing();
  const persisted = await tx.select().from(domainEvents).where(eq(domainEvents.id, input.id)).limit(1);
  const stored = persisted[0];
  if (!stored || stored.event_type !== event.event_type || stored.entity_type !== event.entity_type ||
      stored.entity_id !== event.entity_id) {
    throw new Error("Domain event idempotency conflict: the event id is already bound to a different change.");
  }
  await invalidateDerivedState(tx, { eventId: input.id, eventType: input.eventType, occurredAt });
}

/** Durable invalidation records are committed with their source event. */
export async function invalidateDerivedState(
  tx: any,
  input: { eventId: string; eventType: DomainEventType; occurredAt?: string },
): Promise<string[]> {
  const keys = getInvalidatedProjectionKeys(input.eventType);
  const invalidatedAt = input.occurredAt ?? new Date().toISOString();
  for (const projectionKey of keys) {
    await tx.insert(derivedStateInvalidations).values({
      id: `invalidation:${input.eventId}:${projectionKey}`,
      event_id: input.eventId,
      projection_key: projectionKey,
      reason: input.eventType,
      invalidated_at: invalidatedAt,
      processed_at: null,
    }).onConflictDoNothing();
  }
  return keys;
}

/** Fetch pending invalidations in stable order for projection consumers. */
export async function getPendingDerivedStateInvalidations(tx: any, limit = 100): Promise<Array<typeof derivedStateInvalidations.$inferSelect>> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Invalidation limit must be an integer from 1 to 500.");
  return tx.select().from(derivedStateInvalidations)
    .where(isNull(derivedStateInvalidations.processed_at))
    .orderBy(derivedStateInvalidations.invalidated_at)
    .limit(limit);
}

/** Mark a projection invalidation complete only after its consumer refresh succeeds. */
export async function markDerivedStateInvalidationProcessed(tx: any, id: string, processedAt = new Date().toISOString()): Promise<void> {
  if (!id.trim() || !Number.isFinite(Date.parse(processedAt))) throw new Error("A valid invalidation id and timestamp are required.");
  await tx.update(derivedStateInvalidations)
    .set({ processed_at: processedAt })
    .where(and(eq(derivedStateInvalidations.id, id), isNull(derivedStateInvalidations.processed_at)));
}
