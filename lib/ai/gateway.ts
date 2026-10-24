import { ChatRequestSchema, ChatResponseSchema, TranscriptionResponseSchema } from "./schemas";
import { getAiPreference } from "../data/aiPreferences";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "./riskPhrases";

export type AiErrorCode =
  | "consent"
  | "unauthorized"
  | "rate_limited"
  | "offline"
  | "bad_response"
  | "server"
  | "safety";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

type ErrorPayload = {
  error?: string;
  retry_after?: number;
};

const REQUEST_TIMEOUT_MS = 20_000;
const inFlight = new Map<string, Promise<unknown>>();
const formDataKeys = new WeakMap<FormData, number>();
let nextFormDataKey = 0;

export function mapHttp(status: number, body: ErrorPayload): AiError {
  if (status === 401) {
    return new AiError("unauthorized", body.error ?? "Please sign in again.");
  }
  if (status === 429) {
    return new AiError(
      "rate_limited",
      body.error ?? "Daily AI limit reached.",
      body.retry_after,
    );
  }
  return new AiError("server", body.error ?? "AI service error.");
}

export function mapTransportError(name: string): AiError {
  if (name === "FunctionsFetchError" || name === "FunctionsRelayError") {
    return new AiError("offline", "No connection. Check your internet and try again.");
  }
  return new AiError("server", "AI service request failed.");
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
    const candidate = payload as Record<string, unknown>;
    return {
      error: typeof candidate.error === "string" ? candidate.error : undefined,
      retry_after:
        typeof candidate.retry_after === "number" && Number.isFinite(candidate.retry_after)
          ? candidate.retry_after
          : undefined,
    };
  } catch {
    return {};
  }
}

async function assertConsent(): Promise<void> {
  let consent: string | null;
  try {
    consent = await getAiPreference("ai_consent_v1");
  } catch (error) {
    throw new AiError(
      "server",
      `Could not verify AI consent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (consent !== "accepted") {
    throw new AiError("consent", "Please review and accept the AI data-use notice first.");
  }
}

function requestKey(fn: string, body: object | FormData, key?: string): string {
  if (key) return `${fn}:${key}`;
  if (body instanceof FormData) {
    let formKey = formDataKeys.get(body);
    if (formKey === undefined) {
      formKey = ++nextFormDataKey;
      formDataKeys.set(body, formKey);
    }
    return `${fn}:form:${formKey}`;
  }
  return `${fn}:${JSON.stringify(body)}`;
}

async function invokeWithRetry(
  fn: "ai-chat" | "ai-transcribe",
  body: object | FormData,
): Promise<unknown> {
  if (!isSupabaseConfigured || !supabase) {
    throw new AiError("unauthorized", "Cloud features are not configured.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body,
        timeout: REQUEST_TIMEOUT_MS,
      });

      if (error) {
        const context = error.context;
        if (context instanceof Response) {
          throw mapHttp(context.status, await readErrorPayload(context));
        }
        throw mapTransportError(error.name);
      }

      return data;
    } catch (error) {
      if (error instanceof AiError) {
        if (error.code === "server" && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));
          continue;
        }
        throw error;
      }
      throw new AiError(
        "offline",
        error instanceof Error ? error.message : "AI service request failed.",
      );
    }
  }

  throw new AiError("server", "AI service request failed.");
}

async function call<T>(
  fn: "ai-chat" | "ai-transcribe",
  body: object | FormData,
  decode: (data: unknown) => T,
  deduplicationKey?: string,
): Promise<T> {
  await assertConsent();
  const key = requestKey(fn, body, deduplicationKey);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = invokeWithRetry(fn, body);
    inFlight.set(key, pending);
  }

  try {
    return decode(await pending);
  } finally {
    if (inFlight.get(key) === pending) inFlight.delete(key);
  }
}

export async function chat(input: unknown) {
  const request = ChatRequestSchema.safeParse(input);
  if (!request.success) {
    throw new AiError("bad_response", "The AI request was invalid.");
  }
  if (request.data.messages.some(
    (message) => message.role === "user" && containsEatingSafetyRisk(message.content),
  )) {
    throw new AiError("safety", AI_SAFETY_RESPONSE);
  }

  return call(
    "ai-chat",
    request.data,
    (data) => {
      const response = ChatResponseSchema.safeParse(data);
      if (!response.success) {
        throw new AiError("bad_response", "The AI returned an invalid response.");
      }
      return response.data;
    },
    JSON.stringify(request.data),
  );
}

export async function transcribe(form: FormData, deduplicationKey?: string) {
  return call(
    "ai-transcribe",
    form,
    (data) => {
      const response = TranscriptionResponseSchema.safeParse(data);
      if (!response.success) {
        throw new AiError("bad_response", "The transcription response was invalid.");
      }
      return response.data;
    },
    deduplicationKey,
  );
}
