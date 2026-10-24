import { supabase } from "../supabase/client";

export type AiErrorCode = "consent" | "unauthorized" | "rate_limited" | "offline" | "bad_response" | "server";

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string, public retryAfterSec?: number) {
    super(message);
  }
}

async function assertConsent(): Promise<void> {
  if (!supabase) {
    throw new AiError("unauthorized", "Cloud features are not configured.");
  }

  const { data } = await supabase.from("app_settings").select("value").eq("key", "ai_consent_v1").maybeSingle();
  if (!data || data.value !== "1") {
    throw new AiError("consent", "Please review and accept the AI consent prompt before using AI features.");
  }
}

function mapHttp(status: number, body: { error?: string; retry_after?: number } = {}): AiError {
  if (status === 401) return new AiError("unauthorized", "Please sign in again.");
  if (status === 429) return new AiError("rate_limited", body.error ?? "Daily AI limit reached", body.retry_after);
  return new AiError("server", body.error ?? "AI service is unavailable right now.");
}

async function call<T>(fn: "ai-chat" | "ai-transcribe", body: object | FormData): Promise<T> {
  if (!supabase) throw new AiError("unauthorized", "Cloud features are not configured.");
  await assertConsent();

  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const payload = await context.json();
        throw mapHttp(context.status, payload as { error?: string; retry_after?: number });
      } catch {
        throw mapHttp(context.status ?? 500, {});
      }
    }
    throw new AiError("offline", "No connection to the cloud AI gateway.");
  }

  return data as T;
}

export const chat = <T>(request: object) => call<T>("ai-chat", request);
export const transcribe = (form: FormData) => call<{ text: string }>("ai-transcribe", form);
