import { isSupabaseConfigured, supabase } from "../supabase/client";

type CompletionRequest = {
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
  stream?: boolean;
};

type CompletionResult = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

type TranscriptionResult = {
  text?: string;
};

type GroqClient = {
  chat: {
    completions: {
      create: (request: CompletionRequest) => Promise<CompletionResult>;
    };
  };
  audio: {
    transcriptions: {
      create: (request: { file: unknown; model: string; language?: string; response_format?: string; temperature?: number }) => Promise<TranscriptionResult>;
    };
  };
};

async function createCompletion(request: CompletionRequest): Promise<CompletionResult> {
  if (!isSupabaseConfigured || !supabase) {
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

  return data as CompletionResult;
}

async function createTranscription(request: { file: unknown; model: string; language?: string; response_format?: string; temperature?: number }): Promise<TranscriptionResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("AI is unavailable until Supabase is configured.");
  }

  const form = new FormData();
  if (request.file instanceof Blob) {
    form.append("audio", request.file, "voice.m4a");
  } else if (typeof request.file === "object" && request.file && "uri" in request.file) {
    const fileLike = request.file as { uri?: string; name?: string; type?: string };
    const file = {
      uri: fileLike.uri ?? "voice.m4a",
      name: fileLike.name ?? "voice.m4a",
      type: fileLike.type ?? "audio/m4a",
    } as unknown as Blob;
    form.append("audio", file, fileLike.name ?? "voice.m4a");
  } else {
    throw new Error("Audio file is required for transcription.");
  }
  form.append("model", request.model);
  if (request.response_format) form.append("response_format", request.response_format);
  if (request.language) form.append("language", request.language);
  if (typeof request.temperature === "number") form.append("temperature", String(request.temperature));

  const { data, error } = await supabase.functions.invoke("ai-transcribe", {
    body: form,
  });

  if (error) {
    throw new Error(error.message || "Transcription failed.");
  }

  return data as TranscriptionResult;
}

const edgeGroqClient: GroqClient = {
  chat: {
    completions: {
      create: createCompletion,
    },
  },
  audio: {
    transcriptions: {
      create: createTranscription,
    },
  },
};

export function getGroq(): GroqClient {
  return edgeGroqClient;
}

export const groq = edgeGroqClient;

export function isGroqConfigured(): boolean {
  return isSupabaseConfigured;
}
