jest.mock("../../db/client", () => ({ db: { insert: jest.fn(), select: jest.fn() } }));

import { evaluateGoalEvidence, refreshGoalProgress, type GoalEvidenceFact, type LifeOsGoalDefinition } from "./goalEvidence";
import { db } from "../../db/client";

const goal: LifeOsGoalDefinition = {
  id: "protein-week", metric: "protein_g", targetValue: 120, comparator: "gte",
  aggregation: "sum", unit: "g", windowDays: 1, ruleVersion: "protein-v1",
};
const facts: GoalEvidenceFact[] = [
  { id: "f1", metric: "protein_g", value: 60, unit: "g", occurredAt: "2026-10-15T08:00:00.000Z" },
  { id: "f2", metric: "protein_g", value: 30, unit: "g", occurredAt: "2026-10-15T09:00:00.000Z", deleted: true },
  { id: "f3", metric: "steps", value: 9000, unit: "steps", occurredAt: "2026-10-15T09:00:00.000Z" },
];

describe("Life OS goal evidence", () => {
  it("uses explicit rule, unit, window and live evidence only", () => {
    const snapshot = evaluateGoalEvidence(goal, 60, [facts[0], facts[1]], "2026-10-15T12:00:00.000Z");
    expect(snapshot.status).toBe("in_progress");
    expect(snapshot.progressPercent).toBe(50);
    expect(snapshot.evidenceIds).toEqual(["f1"]);
  });

  it("keeps missing evidence unknown rather than inventing zero progress", () => {
    const snapshot = evaluateGoalEvidence(goal, null, [], "2026-10-15T12:00:00.000Z");
    expect(snapshot.status).toBe("unknown");
    expect(snapshot.currentValue).toBeNull();
    expect(snapshot.progressPercent).toBeNull();
  });

  it("rejects a numeric goal rule without a unit", () => {
    expect(() => evaluateGoalEvidence({ ...goal, unit: null }, 60, [], "2026-10-15T12:00:00.000Z")).not.toThrow();
  });

  it("persists a derived snapshot using an idempotent goal key", async () => {
    const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
    const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
    jest.mocked(db.insert).mockReturnValue({ values } as never);
    const snapshot = await refreshGoalProgress(goal, facts, "2026-10-15T12:00:00.000Z");
    expect(snapshot.currentValue).toBe(60);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ goal_id: "protein-week", status: "in_progress", progress_percent: 50 }));
    expect(onConflictDoUpdate).toHaveBeenCalled();
  });
});
