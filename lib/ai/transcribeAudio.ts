import { supabase } from "../supabase/client";

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!supabase) {
    throw new Error("AI is unavailable until Supabase is configured.");
  }

  const form = new FormData();
  const audioFile = {
    uri: audioUri,
    name: "voice.m4a",
    type: "audio/m4a",
  } as unknown as Blob;
  form.append("audio", audioFile, "voice.m4a");

  const { data, error } = await supabase.functions.invoke("ai-transcribe", {
    body: form,
  });

  if (error) {
    throw new Error(error.message || "Transcription failed.");
  }

  return (data as { text?: string } | null)?.text ?? "";
}

export const transcribeAudioMultilingual = transcribeAudio;
