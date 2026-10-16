jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

jest.mock("../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke: jest.fn() } },
}));

import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../supabase/client";
import { transcribeAudio, transcribeAudioMultilingual } from "./transcribeAudio";

const getInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const readAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;

describe("voice transcription gateway", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, size: 128 });
    readAsStringAsync.mockResolvedValue("YXVkaW8=");
    invoke.mockResolvedValue({ data: { text: "  four eggs and dal  " }, error: null });
  });

  it("rejects an empty recording URI before reading the file", async () => {
    await expect(transcribeAudio(" ")).rejects.toThrow("Audio recording is missing.");
    expect(getInfoAsync).not.toHaveBeenCalled();
  });

  it("rejects missing or empty recordings", async () => {
    getInfoAsync.mockResolvedValueOnce({ exists: false, isDirectory: false });
    await expect(transcribeAudio("file://missing.m4a")).rejects.toThrow("empty or could not be read");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects recordings above the upload limit before reading base64", async () => {
    getInfoAsync.mockResolvedValueOnce({ exists: true, isDirectory: false, size: 20 * 1024 * 1024 + 1 });
    await expect(transcribeAudio("file://large.m4a")).rejects.toThrow("too large");
    expect(readAsStringAsync).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("uses the authenticated edge function and trims the returned transcript", async () => {
    await expect(transcribeAudio("file://meal.m4a")).resolves.toBe("four eggs and dal");
    expect(readAsStringAsync).toHaveBeenCalledWith("file://meal.m4a", {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(invoke).toHaveBeenCalledWith("ai-transcribe", {
      body: { audio_base64: "YXVkaW8=", mime_type: "audio/m4a", language: "en" },
    });
  });

  it("omits the language to allow multilingual detection", async () => {
    await transcribeAudioMultilingual("file://meal.m4a");
    expect(invoke).toHaveBeenCalledWith("ai-transcribe", {
      body: { audio_base64: "YXVkaW8=", mime_type: "audio/m4a" },
    });
  });

  it("surfaces gateway errors instead of fabricating a transcript", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "Invalid session" } });
    await expect(transcribeAudio("file://meal.m4a")).rejects.toThrow("Invalid session");
  });
});
