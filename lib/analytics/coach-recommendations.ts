export type CoachConfidence = "high" | "medium" | "low";

export interface CoachEvidence {
  id: string;
  kind: "nutrition" | "workout" | "recovery" | "measurement";
  summary: string;
}

export interface CoachRecommendation {
  id: string;
  type: "review_food_log" | "protein_support" | "workout_follow_through" | "recovery_check_in";
  title: string;
  explanation: string;
  priority: number;
  confidence: CoachConfidence;
  evidence: CoachEvidence[];
  ruleVersion: "1";
}

export interface CoachStateSnapshot {
  localDate: string;
  nutrition: {
    calories: number;
    calorieTarget: number;
    proteinG: number;
    proteinTargetG: number;
    explicitlyMarkedComplete: boolean;
  } | null;
  workout: {
    plannedToday: boolean;
    completedToday: boolean;
  } | null;
  recovery: {
    sleepHours?: number | null;
    energy?: number | null;
    soreness?: number | null;
    stress?: number | null;
  } | null;
}

export interface NutritionAdherenceEvaluation {
  status: "unlogged" | "provisional" | "reviewed";
  calorieGapKcal: number | null;
  proteinGapG: number | null;
  calorieTargetMet: boolean | null;
  proteinTargetMet: boolean | null;
}

/** Evaluate adherence only against explicit targets; incomplete days remain provisional. */
export function evaluateNutritionAdherence(nutrition: CoachStateSnapshot["nutrition"]): NutritionAdherenceEvaluation {
  if (!nutrition) return { status: "unlogged", calorieGapKcal: null, proteinGapG: null, calorieTargetMet: null, proteinTargetMet: null };
  if (![nutrition.calories, nutrition.calorieTarget, nutrition.proteinG, nutrition.proteinTargetG].every(Number.isFinite) || nutrition.calorieTarget <= 0 || nutrition.proteinTargetG <= 0 || nutrition.calories < 0 || nutrition.proteinG < 0) {
    throw new Error("Nutrition adherence requires finite, non-negative intake and positive targets.");
  }
  return {
    status: nutrition.explicitlyMarkedComplete ? "reviewed" : "provisional",
    calorieGapKcal: nutrition.calorieTarget - nutrition.calories,
    proteinGapG: nutrition.proteinTargetG - nutrition.proteinG,
    calorieTargetMet: nutrition.calories >= nutrition.calorieTarget * 0.9 && nutrition.calories <= nutrition.calorieTarget * 1.1,
    proteinTargetMet: nutrition.proteinG >= nutrition.proteinTargetG,
  };
}
export interface TrainingConsistencyEvaluation {
  plannedToday: boolean;
  completedToday: boolean;
}

/** Use explicit session statuses only; absence of a session is not a missed workout. */
export function evaluateTrainingConsistency(sessions: Array<{ status?: string | null }>): TrainingConsistencyEvaluation {
  return {
    plannedToday: sessions.some((session) => session.status === "planned"),
    completedToday: sessions.some((session) => session.status === "completed"),
  };
}

export function evaluateRecoveryReadiness(recovery: CoachStateSnapshot["recovery"]): { needsRecoveryFocus: boolean; signals: string[] } {
  if (!recovery) return { needsRecoveryFocus: false, signals: [] };
  const signals = [
    recovery.sleepHours != null && Number.isFinite(recovery.sleepHours) && recovery.sleepHours < 6 ? "sleep below 6 hours" : null,
    recovery.energy != null && recovery.energy <= 2 ? "low self-reported energy" : null,
    recovery.soreness != null && recovery.soreness >= 4 ? "high self-reported soreness" : null,
    recovery.stress != null && recovery.stress >= 4 ? "high self-reported stress" : null,
  ].filter((value): value is string => value !== null);
  return { needsRecoveryFocus: signals.length > 0, signals };
}
/**
 * Deterministic candidate recommendations. This function never writes data and
 * deliberately avoids interpreting missing signals as negative evidence.
 */
export function generateCoachRecommendations(
  snapshot: CoachStateSnapshot,
): CoachRecommendation[] {
  const candidates: CoachRecommendation[] = [];

  const nutritionEvaluation = evaluateNutritionAdherence(snapshot.nutrition);
  if (nutritionEvaluation.status === "provisional") {
    candidates.push({
      id: `review-food-log:${snapshot.localDate}`,
      type: "review_food_log",
      title: "Review today's food log",
      explanation: "Today's intake is not marked complete, so adherence is provisional. Review or complete the log before drawing conclusions.",
      priority: 90,
      confidence: "high",
      evidence: [{
        id: `nutrition-completeness:${snapshot.localDate}`,
        kind: "nutrition",
        summary: "Food log has not been explicitly marked complete",
      }],
      ruleVersion: "1",
    });
  }

  if (nutritionEvaluation.status === "reviewed" && snapshot.nutrition && nutritionEvaluation.proteinGapG != null) {
    const { proteinG, proteinTargetG } = snapshot.nutrition;
    if (nutritionEvaluation.proteinGapG > proteinTargetG * 0.25) {
      candidates.push({
        id: `protein-support:${snapshot.localDate}`,
        type: "protein_support",
        title: "Plan a protein-rich meal",
        explanation: "The completed food log is below 75% of the current protein target. Consider a protein-rich meal or snack; this is based on logged intake, not an estimate of unlogged food.",
        priority: 65,
        confidence: "medium",
        evidence: [{
          id: `protein-intake:${snapshot.localDate}`,
          kind: "nutrition",
          summary: `Logged protein ${proteinG} g against a ${proteinTargetG} g target`,
        }],
        ruleVersion: "1",
      });
    }
  }

  if (snapshot.workout?.plannedToday && !snapshot.workout.completedToday) {
    candidates.push({
      id: `workout-follow-through:${snapshot.localDate}`,
      type: "workout_follow_through",
      title: "Check your planned workout",
      explanation: "A workout is planned for today but is not recorded as completed. If plans changed, update the plan rather than treating the session as a failure.",
      priority: 55,
      confidence: "high",
      evidence: [{
        id: `workout-status:${snapshot.localDate}`,
        kind: "workout",
        summary: "Workout planned; no completed session recorded",
      }],
      ruleVersion: "1",
    });
  }

  const recoveryEvaluation = evaluateRecoveryReadiness(snapshot.recovery);
  if (recoveryEvaluation.needsRecoveryFocus) {
      const signals = recoveryEvaluation.signals;
      candidates.push({
        id: `recovery-check-in:${snapshot.localDate}`,
        type: "recovery_check_in",
        title: "Consider a lighter recovery-focused day",
        explanation: `Current self-reported signals: ${signals.join(", ")}. Consider adjusting intensity based on how you feel; this is not a medical assessment.`,
        priority: 95,
        confidence: "medium",
        evidence: [{
          id: `recovery-signals:${snapshot.localDate}`,
          kind: "recovery",
          summary: signals.join("; "),
        }],
        ruleVersion: "1",
      });
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 3);
}


export interface RecommendationExplanation {
  recommendationId: string;
  title: string;
  explanation: string;
  evidence: CoachEvidence[];
  confidence: CoachConfidence;
  priority: number;
  ruleVersion: string;
  limitations: string[];
}

/**
 * Explain an already-validated recommendation without changing its facts or
 * creating new evidence. This is an audit/explanation contract, not a Coach
 * reply fallback: the AI conversation still uses the real provider path.
 */
export function explainRecommendation(recommendation: CoachRecommendation): RecommendationExplanation {
  if (!recommendation.id.trim() || !recommendation.title.trim() || !recommendation.explanation.trim()) {
    throw new Error("A recommendation needs an id, title, and explanation before it can be explained.");
  }
  if (!Number.isFinite(recommendation.priority) || recommendation.priority < 0 || recommendation.priority > 100) {
    throw new Error("Recommendation priority must be a finite value between 0 and 100.");
  }
  if (!recommendation.ruleVersion.trim()) throw new Error("Recommendation rule version is required.");
  if (!Array.isArray(recommendation.evidence) || recommendation.evidence.length === 0) {
    throw new Error("A recommendation cannot be explained without supporting evidence.");
  }
  for (const item of recommendation.evidence) {
    if (!item.id.trim() || !item.summary.trim() || !["nutrition", "workout", "recovery", "measurement"].includes(item.kind)) {
      throw new Error("Recommendation evidence is invalid.");
    }
  }
  return {
    recommendationId: recommendation.id,
    title: recommendation.title,
    explanation: recommendation.explanation,
    evidence: recommendation.evidence.map((item) => ({ ...item })),
    confidence: recommendation.confidence,
    priority: recommendation.priority,
    ruleVersion: recommendation.ruleVersion,
    limitations: ["This explanation uses only the recommendation's recorded evidence; it does not infer unlogged behavior."],
  };
}
