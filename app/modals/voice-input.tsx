import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAudioRecorder, RecordingPresets } from "expo-audio";
import { transcribeAudioMultilingual } from "../../lib/groq/transcribeAudio";
import { parseFoodFromVoice } from "../../lib/groq/parseFood";
import { isGroqConfigured } from "../../lib/groq/client";
import { insertFoodLog } from "../../lib/db/queries/nutrition";
import uuid from "react-native-uuid";

export default function VoiceInputModal() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFood, setParsedFood] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = async () => {
    try {
      // Check if Groq is configured
      if (!isGroqConfigured()) {
        Alert.alert(
          "API Key Required",
          "Groq API key is not configured. Please add GROQ_API_KEY to your .env file.",
          [{ text: "OK" }]
        );
        return;
      }

      const { granted } = await audioRecorder.requestPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for voice logging. Please enable it in your device settings.",
          [{ text: "OK" }]
        );
        return;
      }

      setError(null);
      setTranscript("");
      setParsedFood(null);
      await audioRecorder.record();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Recording error:", err);
      Alert.alert("Recording Error", err?.message || "Could not start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const uri = await audioRecorder.stop();
      
      if (!uri) {
        throw new Error("No audio recorded");
      }

      // Step 1: Transcribe audio using Groq Whisper
      console.log("🎤 Transcribing audio...");
      const transcribedText = await transcribeAudioMultilingual(uri);
      setTranscript(transcribedText);

      // Step 2: Parse food from transcription using Groq LLaMA
      console.log("🍽️ Parsing food from:", transcribedText);
      const foodResult = await parseFoodFromVoice(transcribedText);
      setParsedFood(foodResult);

    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err?.message || "Could not process recording");
      Alert.alert("Processing Error", err?.message || "Could not process recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFoodLogs = async () => {
    if (!parsedFood || !parsedFood.items || parsedFood.items.length === 0) {
      Alert.alert("No Food Items", "No food items were detected. Please try again.");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const meal = parsedFood.meal_suggestion || "snack";

      // Save each food item
      for (const item of parsedFood.items) {
        await insertFoodLog({
          id: uuid.v4() as string,
          date: today,
          meal,
          name: item.name,
          quantity_g: item.quantity_g,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          sugar_g: null,
          sodium_mg: null,
          source: "voice",
          raw_input: transcript,
          created_at: Date.now(),
        });
      }

      Alert.alert(
        "Success!",
        `Logged ${parsedFood.items.length} food item(s) to ${meal}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert("Save Error", err?.message || "Could not save food logs");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
          VOICE LOG
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color="#8080A0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flex: 1, padding: 20, gap: 16 }}>
        {/* Recording Button */}
        <View style={{ alignItems: "center", justifyContent: "center", gap: 24, paddingVertical: 40 }}>
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isRecording ? "#FF475722" : "#00D4AA22",
              borderWidth: 3,
              borderColor: isRecording ? "#FF4757" : "#00D4AA",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#00D4AA" />
            ) : (
              <Feather
                name={isRecording ? "square" : "mic"}
                size={48}
                color={isRecording ? "#FF4757" : "#00D4AA"}
              />
            )}
          </TouchableOpacity>

          <Text style={{ color: "#F0F0F5", fontSize: 16, fontFamily: "DMSans_500Medium", textAlign: "center" }}>
            {isRecording
              ? "Recording... tap to stop"
              : isProcessing
              ? "Processing..."
              : "Tap to start recording"}
          </Text>

          <Text style={{ color: "#4A4A6A", fontSize: 12, fontFamily: "DMSans_400Regular", textAlign: "center", paddingHorizontal: 20 }}>
            Say what you ate, e.g. "4 eggs, a bowl of dal, and 2 rotis"
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={{ backgroundColor: "#FF475722", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#FF4757" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="alert-circle" size={16} color="#FF4757" />
              <Text style={{ color: "#FF4757", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                Error
              </Text>
            </View>
            <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 6 }}>
              {error}
            </Text>
          </View>
        )}

        {/* Transcript Display */}
        {transcript && (
          <View style={{ backgroundColor: "#12121A", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#252535" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Feather name="message-square" size={14} color="#00D4AA" />
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                TRANSCRIPT
              </Text>
            </View>
            <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
              {transcript}
            </Text>
          </View>
        )}

        {/* Parsed Food Display */}
        {parsedFood && parsedFood.items && parsedFood.items.length > 0 && (
          <View style={{ backgroundColor: "#12121A", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#252535", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="check-circle" size={14} color="#00C875" />
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                DETECTED FOOD ({parsedFood.items.length})
              </Text>
            </View>

            {parsedFood.items.map((item: any, index: number) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1A1A26",
                  borderRadius: 8,
                  padding: 12,
                  gap: 6,
                }}
              >
                <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                  {item.name}
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  {item.quantity}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Text style={{ color: "#3B82F6", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                    {item.calories} kcal
                  </Text>
                  <Text style={{ color: "#22C55E", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                    P: {item.protein_g}g
                  </Text>
                  <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                    C: {item.carbs_g}g
                  </Text>
                  <Text style={{ color: "#EF4444", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                    F: {item.fat_g}g
                  </Text>
                </View>
                {item.confidence === "low" && (
                  <Text style={{ color: "#FFB800", fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 4 }}>
                    ⚠️ Low confidence estimate
                  </Text>
                )}
              </View>
            ))}

            {parsedFood.meal_suggestion && (
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 }}>
                Suggested meal: {parsedFood.meal_suggestion}
              </Text>
            )}

            {parsedFood.parse_notes && (
              <Text style={{ color: "#FFB800", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 }}>
                Note: {parsedFood.parse_notes}
              </Text>
            )}

            {/* Save Button */}
            <TouchableOpacity
              onPress={saveFoodLogs}
              style={{
                backgroundColor: "#00D4AA",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#0A0A0F", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                Save to Food Log
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
