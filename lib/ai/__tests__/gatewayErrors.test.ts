jest.mock("../../data/aiPreferences", () => ({
  getAiPreference: jest.fn(),
}));
jest.mock("../../supabase/client", () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

import { AiError, mapHttp, mapTransportError } from "../gateway";

describe("AI gateway error mapping", () => {
  it("maps unauthorized responses", () => {
    const error = mapHttp(401, {});
    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe("unauthorized");
  });

  it("preserves the rate-limit message and retry-after value", () => {
    const error = mapHttp(429, { error: "Please retry.", retry_after: 19 });
    expect(error.code).toBe("rate_limited");
    expect(error.message).toBe("Please retry.");
    expect(error.retryAfterSec).toBe(19);
  });

  it("maps provider failures to a retryable server error", () => {
    expect(mapHttp(500, {}).code).toBe("server");
  });

  it("maps network and relay errors to offline", () => {
    expect(mapTransportError("FunctionsFetchError").code).toBe("offline");
    expect(mapTransportError("FunctionsRelayError").code).toBe("offline");
  });
});
