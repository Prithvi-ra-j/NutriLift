// @ts-nocheck
import { groq } from "./client";
import * as FileSystem from "expo-file-system";
import { safeGroqCall } from "./safeCall";

/**
 * Transcribe audio file using Groq Whisper API
 * @param audioUri - Local file URI from expo-audio recording
 * @returns Transcribed text
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  return safeGroqCall(async () => {
    // Read audio file as base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Blob
    const blob = base64ToBlob(audioBase64, "audio/m4a");
    
    // Create File object for Groq API
    const file = new File([blob], "audio.m4a", { type: "audio/m4a" });

    // Call Groq Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "en", // Change to "hi" for Hindi or remove for auto-detect
      response_format: "text",
      temperature: 0.0, // More deterministic transcription
    });

    return transcription as unknown as string;
  }) as Promise<string>;
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Transcribe audio with language detection
 * Useful for Hinglish (Hindi + English mix)
 */
export async function transcribeAudioMultilingual(audioUri: string): Promise<string> {
  return safeGroqCall(async () => {
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const blob = base64ToBlob(audioBase64, "audio/m4a");
    const file = new File([blob], "audio.m4a", { type: "audio/m4a" });

    // Remove language parameter for auto-detection
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "text",
      temperature: 0.0,
    });

    return transcription as unknown as string;
  }) as Promise<string>;
}
