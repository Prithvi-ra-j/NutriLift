import { eq } from "drizzle-orm";
import { db } from "../client";
import { recommendationOutcomes } from "../schema";
import { fromLocalDateKey, toLocalDateKey } from "../../utils/local-date";
import type { CoachEvidence } from "../../analytics/coach-recommendations";

export type RecommendationOutcome = "accepted" | "dismissed" | "completed" | "corrected";
const VALID_OUTCOMES = new Set<RecommendationOutcome>(["accepted", "dismissed", "completed", "corrected"]);

export async function getRecommendationOutcomesForDate(date = toLocalDateKey()): Promise<Record<string, RecommendationOutcome>> {
  try { fromLocalDateKey(date); } catch { throw new Error("Recommendation date must be a real YYYY-MM-DD calendar date."); }
  const rows = await db.select().from(recommendationOutcomes).where(eq(recommendationOutcomes.local_date, date));
  const result: Record<string, RecommendationOutcome> = {};
  for (const row of rows) {
    if (!VALID_OUTCOMES.has(row.outcome as RecommendationOutcome)) throw new Error("Stored recommendation outcome is invalid.");
    result[row.recommendation_id] = row.outcome as RecommendationOutcome;
  }
  return result;
}

export async function recordRecommendationOutcome(input: {
  recommendationId: string;
  outcome: RecommendationOutcome;
  ruleVersion: string;
  evidence: CoachEvidence[];
  date?: string;
}): Promise<void> {
  const date = input.date ?? toLocalDateKey();
  try { fromLocalDateKey(date); } catch { throw new Error("Recommendation date must be a real YYYY-MM-DD calendar date."); }
  if (!input.recommendationId.trim() || !input.ruleVersion.trim()) throw new Error("Recommendation identity and rule version are required.");
  if (!VALID_OUTCOMES.has(input.outcome)) throw new Error("Recommendation outcome is invalid.");
  const now = new Date().toISOString();
  await db.insert(recommendationOutcomes).values({
    id: `recommendation-outcome:${date}:${input.recommendationId}`,
    recommendation_id: input.recommendationId,
    local_date: date,
    outcome: input.outcome,
    rule_version: input.ruleVersion,
    evidence_json: JSON.stringify(input.evidence),
    created_at: now,
    updated_at: now,
  }).onConflictDoUpdate({
    target: [recommendationOutcomes.local_date, recommendationOutcomes.recommendation_id],
    set: { outcome: input.outcome, rule_version: input.ruleVersion, evidence_json: JSON.stringify(input.evidence), updated_at: now },
  });
}
