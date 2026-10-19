import { redactSensitiveFields } from "./redaction";

describe("redactSensitiveFields", () => {
  it("drops sensitive fields recursively while preserving operational metadata", () => {
    expect(redactSensitiveFields({
      event: "sync.failed",
      attempt: 2,
      email: "person@example.com",
      payload_json: { calories: 1800, id: "private" },
      context: { retryable: true, accessToken: "secret", statusCode: 503 },
    })).toEqual({ event: "sync.failed", attempt: 2, context: { retryable: true, statusCode: 503 } });
  });

  it("redacts credentials and contact details embedded in otherwise safe strings", () => {
    const result = redactSensitiveFields({
      error: "Bearer abc.def.ghi from person@example.com called +1 (555) 123-4567",
      key: "gsk_abcdefghijklmnopqrstuvwxyz123456",
    }) as Record<string, unknown>;
    expect(result.error).not.toContain("person@example.com");
    expect(result.error).not.toContain("555");
    expect(result.error).not.toContain("Bearer abc");
    expect(result.key).toBe("[REDACTED]");
  });

  it("normalizes unsupported and non-finite values safely", () => {
    expect(redactSensitiveFields({ value: Number.NaN, missing: undefined })).toEqual({ value: null, missing: null });
  });
});
