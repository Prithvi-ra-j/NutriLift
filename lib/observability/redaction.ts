/**
 * Privacy boundary for telemetry. Telemetry should contain operational metadata,
 * not user health records, free-form text, credentials, or identifiers.
 */
const SENSITIVE_KEY = /(?:authorization|cookie|token|secret|password|api[_-]?key|access[_-]?key|email|phone|mobile|address|full[_-]?name|first[_-]?name|last[_-]?name|birth|\bdob\b|weight|body[_-]?fat|health|medical|notes?|raw[_-]?input|prompt|message|transcript|conversation|food[_-]?log|recovery|sleep|hrv|resting[_-]?hr|stress|soreness|supplement|payload[_-]?json)/i;
const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\b(?:sk-[A-Za-z0-9_-]{12,}|gsk_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+?\d[\d ().-]{7,}\d)\b/g,
];

export type SafeTelemetryValue = null | boolean | number | string | SafeTelemetryValue[] | { [key: string]: SafeTelemetryValue };

/** Remove sensitive keys recursively and redact common secrets/PII in strings. */
export function redactSensitiveFields(value: unknown): SafeTelemetryValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value);
  }
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (typeof value === "object") {
    const result: { [key: string]: SafeTelemetryValue } = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      result[key] = redactSensitiveFields(item);
    }
    return result;
  }
  return null;
}
