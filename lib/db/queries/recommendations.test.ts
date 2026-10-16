jest.mock("../client", () => ({ db: { transaction: jest.fn() } }));
jest.mock("./domain-events", () => ({ appendDomainEvent: jest.fn() }));

import { db } from "../client";
import { recommendationOutcomes } from "../schema";
import { appendDomainEvent } from "./domain-events";
import { recordRecommendationOutcome } from "./recommendations";

const mockTx = { insert: jest.fn() };

describe("recommendation outcome persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const conflictWrite = jest.fn().mockResolvedValue(undefined);
    const values = jest.fn().mockReturnValue({ onConflictDoUpdate: conflictWrite });
    mockTx.insert.mockReturnValue({ values });
    (db.transaction as jest.Mock).mockImplementation(async (work: (tx: typeof mockTx) => unknown) => work(mockTx));
    (appendDomainEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it("persists an outcome and invalidates Coach projections in the same transaction", async () => {
    await recordRecommendationOutcome({
      recommendationId: "recovery-check-in",
      outcome: "dismissed",
      ruleVersion: "1",
      evidence: [{ id: "recovery:2026-10-16", kind: "recovery", summary: "Manual check-in exists" }],
      date: "2026-10-16",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.insert).toHaveBeenCalledWith(recommendationOutcomes);
    expect(appendDomainEvent).toHaveBeenCalledWith(mockTx, expect.objectContaining({
      eventType: "coach.recommendation.outcome_recorded",
      entityType: "recommendation_outcome",
      entityId: "2026-10-16:recovery-check-in",
      metadata: { outcome: "dismissed", ruleVersion: "1" },
    }));
  });

  it("rejects invalid dates before starting a transaction", async () => {
    await expect(recordRecommendationOutcome({
      recommendationId: "recovery-check-in",
      outcome: "dismissed",
      ruleVersion: "1",
      evidence: [],
      date: "2026-02-30",
    })).rejects.toThrow(/real YYYY-MM-DD/);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
