import { recordAIRequestMetrics, recordAppEvent, recordSyncAttempt } from "./telemetry";

jest.mock("../db/client", () => ({ db: { insert: jest.fn(), select: jest.fn() } }));

describe("operational telemetry contracts", () => {
  it("rejects malformed event names and timestamps before persistence", async () => {
    await expect(recordAppEvent({ eventType: "Bad Event", occurredAt: "not-a-date" })).rejects.toThrow("event type is invalid");
    await expect(recordAppEvent({ eventType: "app.started", occurredAt: "not-a-date" })).rejects.toThrow("timestamp is invalid");
  });

  it("rejects negative sync latency and invalid operation counts", async () => {
    await expect(recordSyncAttempt({ outcome: "success", latencyMs: -1 })).rejects.toThrow("latencyMs must be finite and non-negative");
    await expect(recordSyncAttempt({ outcome: "success", latencyMs: 10, operationCount: 1.5 })).rejects.toThrow("operationCount must be an integer");
  });

  it("requires an AI provider and valid non-negative metrics", async () => {
    await expect(recordAIRequestMetrics({ provider: " ", latencyMs: 20, outputValid: true })).rejects.toThrow("AI provider is required");
    await expect(recordAIRequestMetrics({ provider: "gateway", latencyMs: 20, inputTokens: -3, outputValid: false })).rejects.toThrow("inputTokens must be finite and non-negative");
  });
});
