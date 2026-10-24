import { createClient } from "npm:@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const DEFAULT_MODEL = "whisper-large-v3-turbo";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !groqKey) {
    return Response.json({ error: "AI configuration is incomplete" }, { status: 500, headers: corsHeaders });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Audio upload is required" }, { status: 400, headers: corsHeaders });
  }

  const fileEntry = formData.get("audio");
  if (!(fileEntry instanceof File)) {
    return Response.json({ error: "Audio file is required" }, { status: 400, headers: corsHeaders });
  }

  if (!fileEntry.type.startsWith("audio/")) {
    return Response.json({ error: "Audio uploads must have an audio mime type" }, { status: 400, headers: corsHeaders });
  }

  if (fileEntry.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Audio file exceeds the 5 MB limit" }, { status: 413, headers: corsHeaders });
  }

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

  const DAILY_REQUEST_LIMIT = 100;
  if ((count ?? 0) >= DAILY_REQUEST_LIMIT) {
    return Response.json({ error: "Daily AI request limit reached" }, { status: 429, headers: corsHeaders });
  }

  await admin.from("ai_request_usage").insert({
    user_id: user.id,
    model: Deno.env.get("GROQ_STT_MODEL") ?? DEFAULT_MODEL,
    max_output_tokens: 0,
  });

  const groqModel = Deno.env.get("GROQ_STT_MODEL") ?? DEFAULT_MODEL;
  const upstreamForm = new FormData();
  upstreamForm.append("file", fileEntry, fileEntry.name || "voice.m4a");
  upstreamForm.append("model", groqModel);
  upstreamForm.append("response_format", "json");

  const upstreamResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: upstreamForm,
  });

  const responseText = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = JSON.parse(responseText) as { text?: string };
    return Response.json({ text: payload.text ?? "" }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Audio transcription was invalid" }, { status: 502, headers: corsHeaders });
  }
});
