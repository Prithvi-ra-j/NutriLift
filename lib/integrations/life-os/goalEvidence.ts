import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { lifeOsGoalProgress } from "../../db/schema";

export type GoalComparator = "gte" | "lte" | "eq";
export type GoalAggregation = "latest" | "sum" | "average" | "count";
export type GoalProgressStatus = "unknown" | "in_progress" | "complete";

export interface LifeOsGoalDefinition {
  id: string;
  metric: string;
  targetValue: number;
  comparator: GoalComparator;
  aggregation: GoalAggregation;
  unit?: string | null;
  windowDays?: number | null;
  ruleVersion: string;
}

export interface GoalEvidenceFact {
  id: string;
  metric: string;
  value: number;
  unit?: string | null;
  occurredAt: string;
  deleted?: boolean;
}

export interface GoalProgressSnapshot {
  goalId: string;
  status: GoalProgressStatus;
  currentValue: number | null;
  targetValue: number;
  progressPercent: number | null;
  unit: string | null;
  asOf: string;
  evidenceIds: string[];
  ruleVersion: string;
}

function validateGoal(goal: LifeOsGoalDefinition): void {
  if (!goal.id.trim() || !goal.metric.trim() || !goal.ruleVersion.trim()) throw new Error("Goal identity, metric and rule version are required.");
  if (!Number.isFinite(goal.targetValue) || goal.targetValue < 0) throw new Error("Goal target must be finite and non-negative.");
  if (!["gte", "lte", "eq"].includes(goal.comparator)) throw new Error("Goal comparator is unsupported.");
  if (!["latest", "sum", "average", "count"].includes(goal.aggregation)) throw new Error("Goal aggregation is unsupported.");
  if (goal.windowDays != null && (!Number.isInteger(goal.windowDays) || goal.windowDays < 1 || goal.windowDays > 3650)) {
    throw new Error("Goal evidence window must be an integer from 1 to 3650 days.");
  }
}

function isGoalMet(actual: number, target: number, comparator: GoalComparator): boolean {
  if (comparator === "gte") return actual >= target;
  if (comparator === "lte") return actual <= target;
  return actual === target;
}

function calculateProgress(actual: number, target: number, comparator: GoalComparator): number {
  if (comparator === "eq") return actual === target ? 100 : 0;
  if (comparator === "gte") return target === 0 ? 100 : Math.max(0, Math.min(100, (actual / target) * 100));
  if (actual <= target) return 100;
  return actual === 0 ? 100 : Math.max(0, Math.min(100, (target / actual) * 100));
}

/** Evaluate only explicit goal rules and supplied evidence; never infer a missing target or value. */
export function evaluateGoalEvidence(
  goal: LifeOsGoalDefinition,
  actualValue: number | null,
  evidence: GoalEvidenceFact[],
  asOf = new Date().toISOString(),
): GoalProgressSnapshot {
  validateGoal(goal);
  if (!Number.isFinite(Date.parse(asOf))) throw new Error("Goal evaluation timestamp is invalid.");
  const evidenceIds = evidence.filter((fact) => !fact.deleted).map((fact) => fact.id);
  if (actualValue == null || !Number.isFinite(actualValue)) {
    return { goalId: goal.id, status: "unknown", currentValue: null, targetValue: goal.targetValue, progressPercent: null, unit: goal.unit ?? null, asOf, evidenceIds, ruleVersion: goal.ruleVersion };
  }
  return {
    goalId: goal.id,
    status: isGoalMet(actualValue, goal.targetValue, goal.comparator) ? "complete" : "in_progress",
    currentValue: actualValue,
    targetValue: goal.targetValue,
    progressPercent: calculateProgress(actualValue, goal.targetValue, goal.comparator),
    unit: goal.unit ?? null,
    asOf,
    evidenceIds,
    ruleVersion: goal.ruleVersion,
  };
}

function aggregateEvidence(goal: LifeOsGoalDefinition, facts: GoalEvidenceFact[], asOf: string): { value: number | null; eligible: GoalEvidenceFact[] } {
  const asOfMs = Date.parse(asOf);
  const windowStart = goal.windowDays == null ? Number.NEGATIVE_INFINITY : asOfMs - goal.windowDays * 24 * 60 * 60 * 1000;
  const eligible = facts.filter((fact) => {
    const timestamp = Date.parse(fact.occurredAt);
    return !fact.deleted && fact.metric === goal.metric && Number.isFinite(timestamp) && timestamp <= asOfMs && timestamp >= windowStart &&
      (goal.unit == null || fact.unit === goal.unit) && Number.isFinite(fact.value);
  }).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  if (eligible.length === 0) return { value: null, eligible };
  if (goal.aggregation === "count") return { value: eligible.length, eligible };
  if (goal.aggregation === "latest") return { value: eligible[eligible.length - 1].value, eligible };
  const sum = eligible.reduce((total, fact) => total + fact.value, 0);
  return { value: goal.aggregation === "average" ? sum / eligible.length : sum, eligible };
}

/** Recompute and persist a derived goal snapshot; the external Life OS goal remains the source of truth. */
export async function refreshGoalProgress(
  goal: LifeOsGoalDefinition,
  facts: GoalEvidenceFact[],
  asOf = new Date().toISOString(),
): Promise<GoalProgressSnapshot> {
  validateGoal(goal);
  if (!Number.isFinite(Date.parse(asOf))) throw new Error("Goal refresh timestamp is invalid.");
  const { value, eligible } = aggregateEvidence(goal, facts, asOf);
  const snapshot = evaluateGoalEvidence(goal, value, eligible, asOf);
  const updatedAt = new Date().toISOString();
  await db.insert(lifeOsGoalProgress).values({
    goal_id: snapshot.goalId,
    status: snapshot.status,
    current_value: snapshot.currentValue,
    target_value: snapshot.targetValue,
    progress_percent: snapshot.progressPercent,
    unit: snapshot.unit,
    as_of: snapshot.asOf,
    evidence_json: JSON.stringify(snapshot.evidenceIds),
    rule_version: snapshot.ruleVersion,
    updated_at: updatedAt,
  }).onConflictDoUpdate({
    target: lifeOsGoalProgress.goal_id,
    set: {
      status: snapshot.status,
      current_value: snapshot.currentValue,
      target_value: snapshot.targetValue,
      progress_percent: snapshot.progressPercent,
      unit: snapshot.unit,
      as_of: snapshot.asOf,
      evidence_json: JSON.stringify(snapshot.evidenceIds),
      rule_version: snapshot.ruleVersion,
      updated_at: updatedAt,
    },
  });
  return snapshot;
}

export async function getGoalProgress(goalId: string): Promise<GoalProgressSnapshot | null> {
  if (!goalId.trim()) throw new Error("Goal id is required.");
  const rows = await db.select().from(lifeOsGoalProgress).where(eq(lifeOsGoalProgress.goal_id, goalId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  let evidenceIds: string[];
  try {
    const parsed: unknown = JSON.parse(row.evidence_json);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) throw new Error("Invalid evidence ids.");
    evidenceIds = parsed;
  } catch {
    throw new Error("Stored goal progress evidence is invalid.");
  }
  return {
    goalId: row.goal_id,
    status: row.status as GoalProgressStatus,
    currentValue: row.current_value ?? null,
    targetValue: row.target_value,
    progressPercent: row.progress_percent ?? null,
    unit: row.unit ?? null,
    asOf: row.as_of,
    evidenceIds,
    ruleVersion: row.rule_version,
  };
}
