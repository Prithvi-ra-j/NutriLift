import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const ALLOWED_MODELS = new Set(["openai/gpt-oss-120b"]);
const MAX_REQUEST_BYTES = 256_000;
const MAX_PROMPT_CHARACTERS = 60_000;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARACTERS = 12_000;
const MAX_OUTPUT_TOKENS = 2_000;
const DAILY_REQUEST_LIMIT = 100;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: corsHeaders });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonError("AI request is too large", 413);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return jsonError("Authentication required", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !groqApiKey) {
    console.error("AI gateway server configuration is incomplete");
    return jsonError("AI service is temporarily unavailable", 503);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return jsonError("Invalid session", 401);
    }

    let body: unknown;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
        return jsonError("AI request is too large", 413);
      }
      body = JSON.parse(rawBody);
    } catch {
      return jsonError("Request body must be valid JSON", 400);
    }

    if (!isRecord(body) || !ALLOWED_MODELS.has(String(body.model ?? "")) || !Array.isArray(body.messages)) {
      return jsonError("Unsupported AI request", 400);
    }

    if (body.stream === true || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return jsonError("AI request exceeds gateway limits", 400);
    }

    let promptCharacters = 0;
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    for (const item of body.messages) {
      if (!isRecord(item)
        || !["system", "user", "assistant"].includes(String(item.role))
        || typeof item.content !== "string"
        || item.content.length > MAX_MESSAGE_CHARACTERS) {
        return jsonError("Invalid AI message format", 400);
      }
      promptCharacters += item.content.length;
      if (promptCharacters > MAX_PROMPT_CHARACTERS) {
        return jsonError("AI request exceeds gateway limits", 400);
      }
      messages.push({
        role: item.role as "system" | "user" | "assistant",
        content: item.content,
      });
    }

    const maxTokens = body.max_tokens === undefined ? 1_000 : body.max_tokens;
    if (typeof maxTokens !== "number" || !Number.isInteger(maxTokens) || maxTokens < 1) {
      return jsonError("Invalid output token limit", 400);
    }

    const temperature = body.temperature === undefined ? 0.2 : body.temperature;
    if (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      return jsonError("Invalid temperature", 400);
    }

    let responseFormat: { type: "json_object" } | undefined;
    if (body.response_format !== undefined) {
      if (!isRecord(body.response_format) || body.response_format.type !== "json_object") {
        return jsonError("Unsupported response format", 400);
      }
      responseFormat = { type: "json_object" };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: quotaReserved, error: quotaError } = await admin.rpc("reserve_ai_request_usage", {
      p_user_id: user.id,
      p_model: body.model,
      p_max_output_tokens: Math.min(maxTokens, MAX_OUTPUT_TOKENS),
      p_daily_limit: DAILY_REQUEST_LIMIT,
    });

    if (quotaError) {
      console.error("AI usage reservation failed");
      return jsonError("AI usage tracking is unavailable", 503);
    }
    if (quotaReserved !== true) {
      return jsonError("Daily AI request limit reached", 429);
    }

    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: body.model,
          messages,
          max_tokens: Math.min(maxTokens, MAX_OUTPUT_TOKENS),
          temperature,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          stream: false,
        }),
      });
    } catch {
      return jsonError("AI provider is temporarily unavailable", 502);
    }

    if (!providerResponse.ok) {
      // Do not return raw provider bodies: they can contain implementation details.
      return jsonError(
        providerResponse.status === 429 ? "AI provider rate limit reached" : "AI provider request failed",
        providerResponse.status === 429 ? 429 : 502,
      );
    }

    const responseBody = await providerResponse.text();
    return new Response(responseBody, { status: 200, headers: corsHeaders });
  } catch {
    console.error("Unexpected AI gateway failure");
    return jsonError("AI service is temporarily unavailable", 500);
  }
});
