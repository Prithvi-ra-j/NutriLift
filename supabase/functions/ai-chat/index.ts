import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const body = await request.json();
  if (!ALLOWED_MODELS.has(body.model) || !Array.isArray(body.messages)) {
    return Response.json({ error: "Unsupported AI request" }, { status: 400, headers: corsHeaders });
  }

  if (body.stream || JSON.stringify(body.messages).length > MAX_PROMPT_CHARACTERS) {
    return Response.json({ error: "AI request exceeds gateway limits" }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const startOfDay = new Date().toISOString().slice(0, 10);
  const { count, error: countError } = await admin
    .from("ai_request_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", `${startOfDay}T00:00:00.000Z`);

  if (countError) {
    return Response.json({ error: "AI usage tracking is unavailable" }, { status: 503, headers: corsHeaders });
  }
  if ((count ?? 0) >= DAILY_REQUEST_LIMIT) {
    return Response.json({ error: "Daily AI request limit reached" }, { status: 429, headers: corsHeaders });
  }

  await admin.from("ai_request_usage").insert({
    user_id: user.id,
    model: body.model,
    max_output_tokens: Math.min(Number(body.max_tokens) || 0, MAX_OUTPUT_TOKENS),
  });

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      max_tokens: Math.min(Number(body.max_tokens) || 1_000, MAX_OUTPUT_TOKENS),
      stream: false,
    }),
  });

  const responseBody = await groqResponse.text();
  return new Response(responseBody, {
    status: groqResponse.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});