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

/**
 * Deterministic candidate recommendations. This function never writes data and
 * deliberately avoids interpreting missing signals as negative evidence.
 */
export function generateCoachRecommendations(
  snapshot: CoachStateSnapshot,
): CoachRecommendation[] {
  const candidates: CoachRecommendation[] = [];

  if (snapshot.nutrition && !snapshot.nutrition.explicitlyMarkedComplete) {
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

  if (snapshot.nutrition?.explicitlyMarkedComplete) {
    const { proteinG, proteinTargetG } = snapshot.nutrition;
    if (
      Number.isFinite(proteinG) &&
      Number.isFinite(proteinTargetG) &&
      proteinTargetG > 0 &&
      proteinG < proteinTargetG * 0.75
    ) {
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

  const recovery = snapshot.recovery;
  if (recovery) {
    const lowSleep = recovery.sleepHours != null && Number.isFinite(recovery.sleepHours) && recovery.sleepHours < 6;
    const lowEnergy = recovery.energy != null && recovery.energy <= 2;
    const highSoreness = recovery.soreness != null && recovery.soreness >= 4;
    const highStress = recovery.stress != null && recovery.stress >= 4;

    if (lowSleep || lowEnergy || highSoreness || highStress) {
      const signals = [
        lowSleep ? "sleep below 6 hours" : null,
        lowEnergy ? "low self-reported energy" : null,
        highSoreness ? "high self-reported soreness" : null,
        highStress ? "high self-reported stress" : null,
      ].filter((value): value is string => value !== null);
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
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 3);
}
