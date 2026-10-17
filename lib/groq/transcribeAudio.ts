import * as FileSystem from "expo-file-system/legacy";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { recordAIRequestMetrics } from "../observability/telemetry";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";

async function recordTranscriptionMetrics(input: {
  latencyMs: number;
  outputValid: boolean;
  failureCategory?: string;
}): Promise<void> {
  try {
    await recordAIRequestMetrics({
      provider: "groq-via-supabase",
      model: TRANSCRIPTION_MODEL,
      latencyMs: input.latencyMs,
      outputValid: input.outputValid,
      ...(input.failureCategory ? { failureCategory: input.failureCategory } : {}),
    });
  } catch {
    // Operational telemetry must never hide the transcription result or its real error.
  }
}

async function transcribe(audioUri: string, language?: string): Promise<string> {
  if (!audioUri.trim()) throw new Error("Audio recording is missing.");
  if (!isSupabaseConfigured) {
    throw new Error("Voice transcription is unavailable until Supabase is configured.");
  }

  const info = await FileSystem.getInfoAsync(audioUri);
  if (!info.exists || !("size" in info) || !info.size) {
    throw new Error("The recording is empty or could not be read.");
  }
  if (info.size > MAX_AUDIO_BYTES) {
    throw new Error("Recording is too large. Record a shorter voice note and try again.");
  }

  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const startedAt = Date.now();
  let failureCategory = "gateway_error";
  try {
    const { data, error } = await supabase.functions.invoke("ai-transcribe", {
      body: {
        audio_base64: audioBase64,
        mime_type: "audio/m4a",
        ...(language ? { language } : {}),
      },
    });

    if (error) throw new Error(error.message || "Voice transcription failed.");
    if (typeof data?.text !== "string" || !data.text.trim()) {
      failureCategory = "empty_output";
      throw new Error("The transcription service returned no text. Please try recording again.");
    }

    const text = data.text.trim();
    await recordTranscriptionMetrics({
      latencyMs: Date.now() - startedAt,
      outputValid: true,
    });
    return text;
  } catch (error) {
    await recordTranscriptionMetrics({
      latencyMs: Date.now() - startedAt,
      outputValid: false,
      failureCategory,
    });
    throw error;
  }
}

/** Transcribe a recording in English. */
export async function transcribeAudio(audioUri: string): Promise<string> {
  return transcribe(audioUri, "en");
}

/** Let Whisper detect the language, including Hindi-English mixed speech. */
export async function transcribeAudioMultilingual(audioUri: string): Promise<string> {
  return transcribe(audioUri);
}
