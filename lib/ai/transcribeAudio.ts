import { transcribe } from "./gateway";

export async function transcribeAudio(audioUri: string): Promise<string> {
  const form = new FormData();
  const audioFile = {
    uri: audioUri,
    name: "voice.m4a",
    type: "audio/m4a",
  } as unknown as Blob;
  form.append("audio", audioFile, "voice.m4a");

  const result = await transcribe(form, audioUri);
  const text = result.text.trim();
  if (!text) throw new Error("Transcription returned no speech.");
  return text;
}

export const transcribeAudioMultilingual = transcribeAudio;
