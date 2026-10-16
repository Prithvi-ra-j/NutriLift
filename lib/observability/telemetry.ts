import { desc, gte, isNull, lt } from "drizzle-orm";

import { appTelemetryEvents, derivedStateInvalidations, syncQueue } from "../db/schema";
import { redactSensitiveFields } from "./redaction";

export type TelemetrySeverity = "debug" | "info" | "warn" | "error";

export interface AppEventInput {
  eventType: string;
  severity?: TelemetrySeverity;
  correlationId?: string | null;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export function sanitizeCorrelationId(value?: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 128) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate);
  if (!isUuid && (/@/.test(candidate) || /bearer\s+|eyJ[A-Za-z0-9_-]{10,}\./i.test(candidate) || /\+?\d[\d\s().-]{7,}\d/.test(candidate))) {
    return null;
  }
  return candidate;
}

function validateEventInput(input: AppEventInput): { occurredAt: string; metadataJson: string } {
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(input.eventType)) throw new Error("Telemetry event type is invalid.");
  const severity = input.severity ?? "info";
  if (!["debug", "info", "warn", "error"].includes(severity)) throw new Error("Telemetry severity is invalid.");
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error("Telemetry timestamp is invalid.");
  const safeMetadata = redactSensitiveFields(input.metadata ?? {});
  return { occurredAt, metadataJson: JSON.stringify(safeMetadata) };
}

function assertNonNegativeMetric(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`Telemetry ${label} must be finite and non-negative.`);
  }
}

/** Persist an operational event after privacy filtering; never accept free-form health content. */
export async function recordAppEvent(input: AppEventInput): Promise<void> {
  const { occurredAt, metadataJson } = validateEventInput(input);
  const { db } = await import("../db/client");
  const { default: uuid } = await import("react-native-uuid");
  await db.insert(appTelemetryEvents).values({
    id: uuid.v4() as string,
    event_type: input.eventType,
    severity: input.severity ?? "info",
    correlation_id: sanitizeCorrelationId(input.correlationId),
    occurred_at: occurredAt,
    metadata_json: metadataJson,
  });
}

export async function recordCommandFailure(input: {
  commandName: string;
  errorCategory: string;
  correlationId?: string | null;
}): Promise<void> {
  if (!/^[a-z][a-z0-9_.-]{1,79}$/i.test(input.commandName) || !/^[a-z][a-z0-9_.-]{1,79}$/i.test(input.errorCategory)) throw new Error("Command name and error category must be safe category identifiers.");
  await recordAppEvent({
    eventType: "command.failure",
    severity: "error",
    correlationId: input.correlationId,
    metadata: { commandName: input.commandName, errorCategory: input.errorCategory },
  });
}

export async function recordSyncAttempt(input: {
  outcome: "success" | "retryable_failure" | "permanent_failure";
  latencyMs: number;
  retryCategory?: string | null;
  operationCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
  correlationId?: string | null;
}): Promise<void> {
  assertNonNegativeMetric(input.latencyMs, "latencyMs");
  if (input.retryCategory != null && !/^[a-z0-9_.-]{1,64}$/i.test(input.retryCategory)) throw new Error("Sync retry category must be a safe identifier.");
  for (const [label, value] of [["operationCount", input.operationCount], ["acceptedCount", input.acceptedCount], ["rejectedCount", input.rejectedCount]] as const) {
    assertNonNegativeMetric(value, label);
    if (value !== undefined && !Number.isInteger(value)) throw new Error(`Telemetry ${label} must be an integer.`);
  }
  const severity: TelemetrySeverity = input.outcome === "success" ? "info" : input.outcome === "retryable_failure" ? "warn" : "error";
  await recordAppEvent({
    eventType: "sync.attempt",
    severity,
    correlationId: input.correlationId,
    metadata: {
      outcome: input.outcome,
      latencyMs: input.latencyMs,
      retryCategory: input.retryCategory ?? null,
      operationCount: input.operationCount ?? null,
      acceptedCount: input.acceptedCount ?? null,
      rejectedCount: input.rejectedCount ?? null,
    },
  });
}

export async function recordAIRequestMetrics(input: {
  provider: string;
  model?: string | null;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  outputValid: boolean;
  failureCategory?: string | null;
  correlationId?: string | null;
}): Promise<void> {
  if (!input.provider.trim() || input.provider.length > 80) throw new Error("AI provider is required and must be at most 80 characters.");
  if (input.model != null && input.model.length > 120) throw new Error("AI model name must be at most 120 characters.");
  for (const [label, value] of [["latencyMs", input.latencyMs], ["inputTokens", input.inputTokens ?? undefined], ["outputTokens", input.outputTokens ?? undefined], ["costUsd", input.costUsd ?? undefined]] as const) {
    assertNonNegativeMetric(value, label);
    if (value !== undefined && label !== "costUsd" && !Number.isInteger(value)) throw new Error(`Telemetry ${label} must be an integer.`);
  }
  await recordAppEvent({
    eventType: "ai.request",
    severity: input.failureCategory ? "warn" : "info",
    correlationId: input.correlationId,
    metadata: {
      provider: input.provider,
      model: input.model ?? null,
      latencyMs: input.latencyMs,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      costUsd: input.costUsd ?? null,
      outputValid: input.outputValid,
      failureCategory: input.failureCategory ?? null,
    },
  });
}

export interface LocalHealthSummary {
  pendingSync: number;
  uploadingSync: number;
  needsAttentionSync: number;
  pendingDerivedStateInvalidations: number;
  recentErrorCount: number;
  lastEventAt: string | null;
  recentIssues: Array<{ eventType: string; severity: TelemetrySeverity; occurredAt: string; correlationId: string | null }>;
}

/** Summarize local operational health without returning raw payloads or health records. */
export async function getLocalHealthSummary(): Promise<LocalHealthSummary> {
  const { db } = await import("../db/client");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [queueRows, events, invalidations] = await Promise.all([
    db.select().from(syncQueue),
    db.select().from(appTelemetryEvents)
      .where(gte(appTelemetryEvents.occurred_at, since))
      .orderBy(desc(appTelemetryEvents.occurred_at))
      .limit(100),
    db.select().from(derivedStateInvalidations).where(isNull(derivedStateInvalidations.processed_at)),
  ]);
  const queue = queueRows as Array<{ state?: string | null }>;
  const telemetry = events as Array<{ event_type: string; severity: string; occurred_at: string; correlation_id: string | null }>;
  const recentIssues = telemetry
    .filter((event) => event.severity === "warn" || event.severity === "error")
    .slice(0, 20)
    .map((event) => ({
      eventType: event.event_type,
      severity: event.severity as TelemetrySeverity,
      occurredAt: event.occurred_at,
      correlationId: event.correlation_id ?? null,
    }));
  return {
    pendingSync: queue.filter((item) => item.state === "pending" || item.state === "retry").length,
    uploadingSync: queue.filter((item) => item.state === "uploading").length,
    needsAttentionSync: queue.filter((item) => item.state === "needs_attention" || item.state === "failed").length,
    pendingDerivedStateInvalidations: invalidations.length,
    recentErrorCount: telemetry.filter((event) => event.severity === "error").length,
    lastEventAt: telemetry[0]?.occurred_at ?? null,
    recentIssues,
  };
}


/** Keep the local telemetry database bounded; domain records are never pruned here. */
export async function pruneOldTelemetryEvents(retentionDays = 30): Promise<void> {
  if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 365) {
    throw new Error("Telemetry retention must be an integer from 7 to 365 days.");
  }
  const { db } = await import("../db/client");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  await db.delete(appTelemetryEvents).where(lt(appTelemetryEvents.occurred_at, cutoff));
}
