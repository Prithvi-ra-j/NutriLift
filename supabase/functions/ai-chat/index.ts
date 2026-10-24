import {
  authenticate,
  consumeQuota,
  errorResponse,
  logUsage,
  refundQuota,
  type QuotaLease,
} from "../_shared/ai.ts";
import { chatRequestSchema, type ChatRequest } from "../_shared/ai-schema.ts";

const MAX_PROMPT_CHARACTERS = 60_000;
const MAX_OUTPUT_TOKENS = 1_500;
const UPSTREAM_TIMEOUT_MS = 25_000;
const ALLOWED_MODELS = new Set(["openai/gpt-oss-120b"]);

function tokenCount(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.prompt_tokens === "number" && Number.isInteger(candidate.prompt_tokens) &&
      candidate.prompt_tokens >= 0
    ? candidate.prompt_tokens
    : null;
}

function completionTokenCount(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.completion_tokens === "number" &&
      Number.isInteger(candidate.completion_tokens) &&
      candidate.completion_tokens >= 0
    ? candidate.completion_tokens
    : null;
}

async function refundAfterFailure(
  userId: string,
  lease: QuotaLease,
): Promise<void> {
  try {
    await refundQuota(userId, lease);
  } catch {
    console.error("[ai-chat] quota refund failed", { userId });
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  const authenticated = await authenticate(request);
  if (authenticated instanceof Response) return authenticated;

  const apiKey = Deno.env.get("GROQ_API_KEY");
  const model = Deno.env.get("GROQ_CHAT_MODEL");
  if (!apiKey || !model || !ALLOWED_MODELS.has(model)) {
    return errorResponse("AI configuration is incomplete.", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Unsupported AI request.", 400);
  const aiRequest: ChatRequest = parsed.data;
  if (JSON.stringify(aiRequest.messages).length > MAX_PROMPT_CHARACTERS) {
    return errorResponse("AI request exceeds gateway limits.", 400);
  }

  const quota = await consumeQuota(authenticated.client, authenticated.userId);
  if (quota.status === "unavailable") {
    return errorResponse("AI usage tracking is unavailable.", 503);
  }
  if (quota.status === "rate_limited") {
    return errorResponse(
      "AI request limit reached. Please try again shortly.",
      429,
      quota.retryAfterSec,
    );
  }
  const quotaLease = quota.lease;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: aiRequest.messages,
        response_format: aiRequest.response_format
          ? { type: aiRequest.response_format }
          : undefined,
        temperature: aiRequest.temperature,
        max_tokens: Math.min(aiRequest.max_tokens ?? 1_000, MAX_OUTPUT_TOKENS),
        stream: false,
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    await refundAfterFailure(authenticated.userId, quotaLease);
    if (error instanceof DOMException && error.name === "AbortError") {
      return errorResponse("AI provider timed out.", 504);
    }
    console.error("[ai-chat] upstream request failed", { userId: authenticated.userId });
    return errorResponse("AI provider is temporarily unavailable.", 502);
  }
  clearTimeout(timeout);

  if (!upstreamResponse.ok) {
    await refundAfterFailure(authenticated.userId, quotaLease);
    if (upstreamResponse.status === 429) {
      const retryAfter = Number(upstreamResponse.headers.get("Retry-After"));
      return errorResponse(
        "AI provider rate limit reached. Please try again shortly.",
        429,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60,
      );
    }
    console.error("[ai-chat] upstream rejected request", {
      userId: authenticated.userId,
      status: upstreamResponse.status,
    });
    return errorResponse("AI provider request failed.", 502);
  }

  let responseBody: unknown;
  try {
    responseBody = await upstreamResponse.json();
  } catch {
    await refundAfterFailure(authenticated.userId, quotaLease);
    return errorResponse("AI provider returned an invalid response.", 502);
  }

  const usage = responseBody && typeof responseBody === "object"
    ? (responseBody as Record<string, unknown>).usage
    : undefined;
  const logged = await logUsage(
    "chat",
    authenticated.userId,
    model,
    tokenCount(usage),
    completionTokenCount(usage),
  );
  if (!logged) {
    console.error("[ai-chat] usage logging failed", { userId: authenticated.userId });
  }
  return Response.json(responseBody);
});
