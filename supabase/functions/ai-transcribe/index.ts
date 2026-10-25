import {
  authenticate,
  consumeQuota,
  errorResponse,
  logUsage,
  refundQuota,
  type QuotaLease,
} from "../_shared/ai.ts";
import { readBoundedMultipart } from "../_shared/multipart.ts";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 25_000;

async function refundAfterFailure(
  userId: string,
  lease: QuotaLease,
): Promise<void> {
  try {
    await refundQuota(userId, lease);
  } catch {
    console.error("[ai-transcribe] quota refund failed", { userId });
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  const authenticated = await authenticate(request);
  if (authenticated instanceof Response) return authenticated;

  const apiKey = Deno.env.get("GROQ_API_KEY");
  const model = Deno.env.get("GROQ_STT_MODEL");
  if (!apiKey || !model || !/whisper/i.test(model)) {
    return errorResponse("Transcription configuration is incomplete.", 500);
  }

  const multipart = await readBoundedMultipart(request, MAX_AUDIO_BYTES);
  if (multipart.status === "too_large") {
    return errorResponse("Audio upload must not exceed 5 MB.", 413);
  }
  if (multipart.status === "invalid") {
    return errorResponse("Audio upload is required.", 400);
  }
  const formData = multipart.formData;
  const audioEntries = formData.getAll("audio");
  if (audioEntries.length !== 1 || [...formData.keys()].some((key) => key !== "audio")) {
    return errorResponse("Exactly one audio file is required.", 400);
  }
  const audio = audioEntries[0];
  if (!(audio instanceof File)) return errorResponse("Audio file is required.", 400);
  if (!audio.type.startsWith("audio/")) {
    return errorResponse("Audio uploads must have an audio MIME type.", 400);
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return errorResponse("Audio file must be between 1 byte and 5 MB.", 413);
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

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, audio.name || "voice.m4a");
  upstreamForm.append("model", model);
  upstreamForm.append("response_format", "json");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });
  } catch (error) {
    clearTimeout(timeout);
    await refundAfterFailure(authenticated.userId, quotaLease);
    if (error instanceof DOMException && error.name === "AbortError") {
      return errorResponse("Transcription provider timed out.", 504);
    }
    console.error("[ai-transcribe] upstream request failed", { userId: authenticated.userId });
    return errorResponse("Transcription provider is temporarily unavailable.", 502);
  }
  if (!upstreamResponse.ok) {
    clearTimeout(timeout);
    await refundAfterFailure(authenticated.userId, quotaLease);
    if (upstreamResponse.status === 429) {
      const retryAfter = Number(upstreamResponse.headers.get("Retry-After"));
      return errorResponse(
        "Transcription provider rate limit reached. Please try again shortly.",
        429,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60,
      );
    }
    console.error("[ai-transcribe] upstream rejected request", {
      userId: authenticated.userId,
      status: upstreamResponse.status,
    });
    return errorResponse("Transcription provider request failed.", 502);
  }

  let payload: unknown;
  try {
    payload = await upstreamResponse.json();
  } catch (error) {
    clearTimeout(timeout);
    await refundAfterFailure(authenticated.userId, quotaLease);
    if (error instanceof DOMException && error.name === "AbortError") {
      return errorResponse("Transcription provider timed out.", 504);
    }
    return errorResponse("Transcription provider returned an invalid response.", 502);
  }
  clearTimeout(timeout);
  if (!payload || typeof payload !== "object" || typeof (payload as { text?: unknown }).text !== "string") {
    await refundAfterFailure(authenticated.userId, quotaLease);
    return errorResponse("Transcription provider returned an invalid response.", 502);
  }
  const text = (payload as { text: string }).text.trim();
  if (!text) {
    await refundAfterFailure(authenticated.userId, quotaLease);
    return errorResponse("No speech was detected in the recording.", 422);
  }

  const logged = await logUsage("transcription", authenticated.userId, model, null, null);
  if (!logged) {
    console.error("[ai-transcribe] usage logging failed", { userId: authenticated.userId });
  }
  return Response.json({ text });
});
