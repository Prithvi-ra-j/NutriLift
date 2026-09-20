import type Groq from "groq-sdk";
import { isSupabaseConfigured, supabase } from "../supabase/client";

type CompletionRequest = {
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
  stream?: boolean;
};

async function createCompletion(request: CompletionRequest): Promise<unknown> {
  if (!isSupabaseConfigured) {
    throw new Error("AI is unavailable until Supabase is configured.");
  }

  if (request.stream) {
    throw new Error("Streaming is not supported by the configured AI gateway.");
  }

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: request,
  });

  if (error) {
    throw new Error(error.message || "AI request failed.");
  }

  return data;
}

const edgeGroqClient = {
  chat: {
    completions: {
      create: createCompletion,
    },
  },
};

export function getGroq(): Groq {
  return edgeGroqClient as unknown as Groq;
}

export const groq = edgeGroqClient as unknown as Groq;

export function isGroqConfigured(): boolean {
  return isSupabaseConfigured;
}
