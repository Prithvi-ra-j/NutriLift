import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  RecordingPresets,
} from "expo-audio";
import { transcribeAudioMultilingual } from "../../lib/ai/transcribeAudio";
import { parseFoodFromVoice } from "../../lib/ai/parsers";
import {
  FoodParseSchema,
  type FoodParseResult,
  type ParsedFoodItem,
} from "../../lib/ai/schemas";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "../../lib/ai/riskPhrases";
import { getAiPreference } from "../../lib/data/aiPreferences";
import { AiError } from "../../lib/ai/gateway";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { insertFoodLogs } from "../../lib/data";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { VoiceFoodReview } from "../../components/voice/VoiceFoodReview";
import { M3 } from "../../design-system/tokens";
import uuid from "react-native-uuid";
import { useToday } from "../../lib/time/useToday";
import { localDateParam } from "../../lib/time/localDate";
import { nowUnix } from "../../lib/time/clock";
import { logger } from "../../lib/logger";
import { useToast } from "../../components/ui/Toast";

export default function VoiceInputModal() {
  const params = useLocalSearchParams<{ date?: string }>();
  const today = useToday();
  const logDate = localDateParam(params.date, today);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFood, setParsedFood] = useState<FoodParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { show } = useToast();

  const startRecording = async () => {
    try {
      if (!isSupabaseConfigured) {
        show({
          message: "Voice logging is unavailable because the AI service is not configured.",
          kind: "error",
        });
        return;
      }
      const consent = await getAiPreference("ai_consent_v1");
      if (consent !== "accepted") {
        router.push("/modals/ai-consent");
        return;
      }

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        show({
          message: "Microphone access is required for voice logging.",
          kind: "error",
        });
        return;
      }

      setError(null);
      setTranscript("");
      setParsedFood(null);
      setIsConfirming(false);
      await audioRecorder.record();
      setIsRecording(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start recording. Please try again.";
      logger.error("Recording error", { error: message });
      setError(message);
      show({ message, kind: "error" });
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const uri = await audioRecorder.stop();
      
      if (uri === undefined || uri === null) {
        throw new Error("No audio recorded");
      }

      logger.info("Transcribing audio for voice log");
      const transcribedText = await transcribeAudioMultilingual(uri);
      if (containsEatingSafetyRisk(transcribedText)) {
        setTranscript("");
        setParsedFood(null);
        setError(AI_SAFETY_RESPONSE);
        show({ message: AI_SAFETY_RESPONSE, kind: "info" });
        return;
      }
      setTranscript(transcribedText);
    } catch (err: unknown) {
      if (err instanceof AiError && err.code === "safety") {
        setTranscript("");
        setParsedFood(null);
        setError(AI_SAFETY_RESPONSE);
        show({ message: AI_SAFETY_RESPONSE, kind: "info" });
        return;
      }
      if (err instanceof AiError && err.code === "consent") {
        router.push("/modals/ai-consent");
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Processing error", { error: message });
      setError(message || "Could not process recording");
      show({
        message: message || "Could not process the recording. Try again.",
        kind: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseTranscript = async () => {
    if (!transcript.trim()) {
      show({ message: "Add a transcript before reviewing food items.", kind: "error" });
      return;
    }
    if (containsEatingSafetyRisk(transcript)) {
      setTranscript("");
      setParsedFood(null);
      setError(AI_SAFETY_RESPONSE);
      show({ message: AI_SAFETY_RESPONSE, kind: "info" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      logger.info("Parsing reviewed voice transcript", {
        transcriptionLength: transcript.length,
      });
      setParsedFood(await parseFoodFromVoice(transcript));
      setIsConfirming(false);
    } catch (err: unknown) {
      if (err instanceof AiError && err.code === "safety") {
        setTranscript("");
        setParsedFood(null);
        setError(AI_SAFETY_RESPONSE);
        show({ message: AI_SAFETY_RESPONSE, kind: "info" });
        return;
      }
      if (err instanceof AiError && err.code === "consent") {
        router.push("/modals/ai-consent");
      }
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Could not review food items.");
      logger.error("Food review error", { error: message });
      show({ message: message || "Could not review food items.", kind: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateParsedItem = (
    index: number,
    changes: Partial<ParsedFoodItem>,
  ) => {
    setParsedFood((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item, itemIndex) => {
          if (itemIndex !== index) return item;
          const updated = { ...item, ...changes };
          return {
            ...updated,
            needs_review:
              Math.abs(
                updated.calories -
                  (4 * updated.protein_g +
                    4 * updated.carbs_g +
                    9 * updated.fat_g),
              ) >
              0.3 * updated.calories + 20,
          };
        }),
      };
    });
  };

  const saveFoodLogs = async () => {
    if (!parsedFood || parsedFood.items.length === 0) {
      show({ message: "No food items were detected. Review the transcript first.", kind: "error" });
      return;
    }

    const validated = FoodParseSchema.safeParse({
      ...parsedFood,
      items: parsedFood.items.map(({ needs_review: _needsReview, ...item }) => item),
    });
    if (!validated.success) {
      show({ message: "Check each food name and nutrition value before saving.", kind: "error" });
      return;
    }

    try {
      const meal = validated.data.meal_suggestion || "snack";
      await insertFoodLogs(
        validated.data.items.map((item) => ({
          id: uuid.v4() as string,
          date: logDate,
          meal,
          name: item.name,
          quantity_g: item.quantity_g ?? null,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g ?? null,
          sugar_g: null,
          sodium_mg: null,
          source: "voice",
          raw_input: transcript,
          created_at: nowUnix(),
        })),
      );
      setIsConfirming(false);
      show({
        message: `Saved ${validated.data.items.length} reviewed food item(s) to ${meal}.`,
        kind: "success",
      });
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save food logs.";
      logger.error("Save error", { error: message });
      show({ message, kind: "error" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader title="VOICE LOG" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16 }}>
        {/* Recording Button */}
        <View style={{ alignItems: "center", justifyContent: "center", gap: 24, paddingVertical: 40 }}>
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            activeOpacity={0.85}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isRecording ? M3.colors.errorContainer : M3.colors.primaryContainer,
              borderWidth: 3,
              borderColor: isRecording ? M3.colors.error : M3.colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={M3.colors.primary} />
            ) : (
              <Feather
                name={isRecording ? "square" : "mic"}
                size={48}
                color={isRecording ? M3.colors.error : M3.colors.primary}
              />
            )}
          </TouchableOpacity>

          <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_500Medium", textAlign: "center" }}>
            {isRecording
              ? "Recording... tap to stop"
              : isProcessing
              ? "Processing..."
              : "Tap to start recording"}
          </Text>

          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center", paddingHorizontal: 20 }}>
            Say what you ate, e.g. "4 eggs, a bowl of dal, and 2 rotis"
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={{ backgroundColor: M3.colors.errorContainer, borderRadius: M3.shape.large, padding: 16, borderWidth: 1, borderColor: M3.colors.error }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="alert-circle" size={16} color={M3.colors.error} />
              <Text style={{ color: M3.colors.error, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                Error
              </Text>
            </View>
            <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 6 }}>
              {error}
            </Text>
          </View>
        )}

        <VoiceFoodReview
          isConfirming={isConfirming}
          isProcessing={isProcessing}
          onCancelConfirm={() => setIsConfirming(false)}
          onConfirmSave={saveFoodLogs}
          onParseTranscript={() => { void parseTranscript(); }}
          onRequestSave={() => setIsConfirming(true)}
          onTranscriptChange={(value) => {
            setTranscript(value);
            setParsedFood(null);
            setIsConfirming(false);
            setError(null);
          }}
          onUpdateItem={updateParsedItem}
          parsedFood={parsedFood}
          transcript={transcript}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
