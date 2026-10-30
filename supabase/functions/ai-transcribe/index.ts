import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const DAILY_REQUEST_LIMIT = 100;
const ALLOWED_MIME_TYPES = new Set(["audio/m4a", "audio/mp4", "audio/mpeg", "audio/wav", "audio/webm"]);

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
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !groqApiKey) {
    return Response.json({ error: "Transcription service is not configured." }, { status: 503, headers: corsHeaders });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });
  }

  let body: { audio_base64?: unknown; mime_type?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const audioBase64 = body.audio_base64;
  const mimeType = body.mime_type;
  const language = body.language;
  if (typeof audioBase64 !== "string" || !audioBase64 || audioBase64.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 8) {
    return Response.json({ error: "Audio is missing or exceeds the 20 MB limit." }, { status: 413, headers: corsHeaders });
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return Response.json({ error: "Unsupported audio format." }, { status: 400, headers: corsHeaders });
  }
  if (language !== undefined && (typeof language !== "string" || !/^[a-z]{2,3}$/.test(language))) {
    return Response.json({ error: "Invalid language code." }, { status: 400, headers: corsHeaders });
  }

  const bytes = Uint8Array.from(atob(audioBase64), (character) => character.charCodeAt(0));
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Audio is empty or exceeds the 20 MB limit." }, { status: 413, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: quotaReserved, error: quotaError } = await admin.rpc("reserve_ai_request_usage", {
    p_user_id: user.id,
    p_model: "whisper-large-v3-turbo",
    p_max_output_tokens: 0,
    p_daily_limit: DAILY_REQUEST_LIMIT,
  });
  if (quotaError) {
    return Response.json({ error: "AI usage tracking is unavailable" }, { status: 503, headers: corsHeaders });
  }
  if (quotaReserved !== true) {
    return Response.json({ error: "Daily AI request limit reached" }, { status: 429, headers: corsHeaders });
  }

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), mimeType === "audio/m4a" ? "recording.m4a" : `recording.${mimeType.split("/")[1]}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (typeof language === "string") form.append("language", language);

  const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}` },
    body: form,
  });
  const responseText = await groqResponse.text();
  if (!groqResponse.ok) {
    const message = groqResponse.status === 401
      ? "The transcription provider rejected its server credentials."
      : groqResponse.status === 429
        ? "Transcription rate limit reached. Please try again later."
        : "Voice transcription failed. Please try recording again.";
    return Response.json({ error: message }, { status: groqResponse.status, headers: corsHeaders });
  }

  let transcription: { text?: unknown };
  try {
    transcription = JSON.parse(responseText);
  } catch {
    return Response.json({ error: "Transcription provider returned an invalid response." }, { status: 502, headers: corsHeaders });
  }
  if (typeof transcription.text !== "string" || !transcription.text.trim()) {
    return Response.json({ error: "No speech was detected in the recording." }, { status: 422, headers: corsHeaders });
  }

  return Response.json({ text: transcription.text.trim() }, { headers: corsHeaders });
});
