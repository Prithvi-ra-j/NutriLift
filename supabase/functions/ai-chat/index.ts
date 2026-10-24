import { createClient } from "npm:@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MODELS = new Set(["openai/gpt-oss-120b"]);
const MAX_PROMPT_CHARACTERS = 60_000;
const MAX_OUTPUT_TOKENS = 2_000;
const DAILY_REQUEST_LIMIT = 100;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Unsupported AI request" }, { status: 400, headers: corsHeaders });
  }

  const candidate = body as {
    model?: unknown;
    messages?: unknown;
    response_format?: unknown;
    temperature?: unknown;
    max_tokens?: unknown;
    stream?: unknown;
  };

  if (candidate.stream !== undefined || !Array.isArray(candidate.messages) || candidate.messages.length === 0 || candidate.messages.length > 30) {
    return Response.json({ error: "Unsupported AI request" }, { status: 400, headers: corsHeaders });
  }

  const modelName = Deno.env.get("GROQ_CHAT_MODEL") ?? "openai/gpt-oss-120b";
  if (!ALLOWED_MODELS.has(modelName)) {
    return Response.json({ error: "Unsupported AI request" }, { status: 400, headers: corsHeaders });
  }

  let normalizedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  try {
    normalizedMessages = candidate.messages.map((message) => {
      if (!message || typeof message !== "object") {
        throw new Error("Invalid message payload");
      }
      const entry = message as { role?: unknown; content?: unknown };
      if (entry.role !== "system" && entry.role !== "user" && entry.role !== "assistant") {
        throw new Error("Invalid role");
      }
      if (typeof entry.content !== "string" || entry.content.length === 0 || entry.content.length > 12_000) {
        throw new Error("Invalid content");
      }
      return { role: entry.role, content: entry.content };
    });
  } catch {
    return Response.json({ error: "Unsupported AI request" }, { status: 400, headers: corsHeaders });
  }

  if (JSON.stringify(normalizedMessages).length > MAX_PROMPT_CHARACTERS) {
    return Response.json({ error: "AI request exceeds gateway limits" }, { status: 400, headers: corsHeaders });
  }

  const responseFormat = candidate.response_format === "json_object" || candidate.response_format === "text"
    ? candidate.response_format
    : undefined;
  const temperature = typeof candidate.temperature === "number" ? Math.min(Math.max(candidate.temperature, 0), 1.5) : undefined;
  const maxTokens = typeof candidate.max_tokens === "number" ? Math.min(Math.max(Math.round(candidate.max_tokens), 1), 1_500) : undefined;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("ai_request_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfUtcDay.toISOString());

  if (countError) {
    return Response.json({ error: "AI usage tracking is unavailable" }, { status: 503, headers: corsHeaders });
  }
  if ((count ?? 0) >= DAILY_REQUEST_LIMIT) {
    return Response.json({ error: "Daily AI request limit reached" }, { status: 429, headers: corsHeaders });
  }

  await admin.from("ai_request_usage").insert({
    user_id: user.id,
    model: modelName,
    max_output_tokens: Math.min(Number(maxTokens) || 0, MAX_OUTPUT_TOKENS),
  });

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: normalizedMessages,
      response_format: responseFormat ? { type: responseFormat } : undefined,
      temperature,
      max_tokens: Math.min(Number(maxTokens) || 1_000, MAX_OUTPUT_TOKENS),
      stream: false,
    }),
  });

  const responseBody = await groqResponse.text();
  return new Response(responseBody, {
    status: groqResponse.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
