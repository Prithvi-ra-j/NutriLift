import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { parseInBodyText, type InBodyParseResult } from "../../lib/ai/parsers";
import { insertBodyStat } from "../../lib/db/queries/body";
import { Card } from "../../components/ui/Card";
import uuid from "react-native-uuid";

export default function InBodyPasteModal() {
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<InBodyParseResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dateOverride, setDateOverride] = useState(new Date().toISOString().split("T")[0]);

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseInBodyText(pasteText);
      setParsed(result);
      if (result.date) setDateOverride(result.date);
    } catch (err) {
      Alert.alert("Parse Failed", "Could not parse InBody data. Please check the input and try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setIsSaving(true);
    try {
      await insertBodyStat({
        id: uuid.v4() as string,
        date: dateOverride,
        type: "inbody",
        weight_kg: parsed.weight_kg,
        body_fat_pct: parsed.body_fat_pct,
        body_fat_mass_kg: parsed.body_fat_mass_kg,
        skeletal_muscle_mass_kg: parsed.skeletal_muscle_mass_kg,
        lean_body_mass_kg: parsed.lean_body_mass_kg,
        bmi: parsed.bmi,
        inbody_score: parsed.inbody_score,
        tbw_l: parsed.tbw_l,
        ecw_tbw_ratio: parsed.ecw_tbw_ratio,
        visceral_fat_level: parsed.visceral_fat_level,
        seg_muscle_right_arm: parsed.segmental_muscle.right_arm_kg,
        seg_muscle_left_arm: parsed.segmental_muscle.left_arm_kg,
        seg_muscle_trunk: parsed.segmental_muscle.trunk_kg,
        seg_muscle_right_leg: parsed.segmental_muscle.right_leg_kg,
        seg_muscle_left_leg: parsed.segmental_muscle.left_leg_kg,
        seg_fat_right_arm: parsed.segmental_fat.right_arm_kg,
        seg_fat_left_arm: parsed.segmental_fat.left_arm_kg,
        seg_fat_trunk: parsed.segmental_fat.trunk_kg,
        seg_fat_right_leg: parsed.segmental_fat.right_leg_kg,
        seg_fat_left_leg: parsed.segmental_fat.left_leg_kg,
        raw_paste: pasteText,
        source: "inbody_paste",
      });
      Alert.alert("Saved", "InBody data imported successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Save Failed", "Could not save InBody data.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 }}>
          <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
            IMPORT INBODY
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={22} color="#8080A0" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            Paste your InBody report text below. You can get this by asking Claude or ChatGPT to extract the data from your InBody PDF.
          </Text>

          <TextInput
            value={pasteText}
            onChangeText={setPasteText}
            placeholder="Paste InBody report text here..."
            placeholderTextColor="#4A4A6A"
            multiline
            numberOfLines={10}
            style={{
              backgroundColor: "#12121A",
              borderRadius: 8,
              padding: 14,
              color: "#F0F0F5",
              fontSize: 13,
              fontFamily: "DMSans_400Regular",
              borderWidth: 1,
              borderColor: "#252535",
              textAlignVertical: "top",
              minHeight: 180,
            }}
          />

          <TouchableOpacity
            onPress={handleParse}
            disabled={!pasteText.trim() || isParsing}
            style={{
              backgroundColor: pasteText.trim() && !isParsing ? "#00D4AA" : "#1A1A26",
              borderRadius: 8,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isParsing ? (
              <ActivityIndicator size="small" color="#0A0A0F" />
            ) : (
              <Feather name="cpu" size={16} color={pasteText.trim() ? "#0A0A0F" : "#4A4A6A"} />
            )}
            <Text style={{ color: pasteText.trim() && !isParsing ? "#0A0A0F" : "#4A4A6A", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
              {isParsing ? "Parsing..." : "Extract Data"}
            </Text>
          </TouchableOpacity>

          {parsed && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{
                  backgroundColor: parsed.parse_confidence === "high" ? "#00C87522" : parsed.parse_confidence === "medium" ? "#FFB80022" : "#FF475722",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                  <Text style={{
                    color: parsed.parse_confidence === "high" ? "#00C875" : parsed.parse_confidence === "medium" ? "#FFB800" : "#FF4757",
                    fontSize: 10,
                    fontFamily: "DMSans_700Bold",
                    textTransform: "uppercase",
                  }}>
                    {parsed.parse_confidence} confidence
                  </Text>
                </View>
                {parsed.missing_fields.length > 0 && (
                  <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                    {parsed.missing_fields.length} fields missing
                  </Text>
                )}
              </View>

              {/* Date */}
              <View>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                  Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={dateOverride}
                  onChangeText={setDateOverride}
                  style={{
                    backgroundColor: "#12121A",
                    borderRadius: 8,
                    padding: 12,
                    color: "#F0F0F5",
                    fontSize: 14,
                    fontFamily: "DMSans_400Regular",
                    borderWidth: 1,
                    borderColor: "#252535",
                  }}
                />
              </View>

              <Card>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  EXTRACTED DATA
                </Text>
                {[
                  { label: "Weight", value: parsed.weight_kg ? `${parsed.weight_kg}kg` : "—" },
                  { label: "Body Fat %", value: parsed.body_fat_pct ? `${parsed.body_fat_pct}%` : "—" },
                  { label: "Body Fat Mass", value: parsed.body_fat_mass_kg ? `${parsed.body_fat_mass_kg}kg` : "—" },
                  { label: "Skeletal Muscle", value: parsed.skeletal_muscle_mass_kg ? `${parsed.skeletal_muscle_mass_kg}kg` : "—" },
                  { label: "Lean Body Mass", value: parsed.lean_body_mass_kg ? `${parsed.lean_body_mass_kg}kg` : "—" },
                  { label: "BMI", value: parsed.bmi ? `${parsed.bmi}` : "—" },
                  { label: "InBody Score", value: parsed.inbody_score ? `${parsed.inbody_score}` : "—" },
                  { label: "Total Body Water", value: parsed.tbw_l ? `${parsed.tbw_l}L` : "—" },
                  { label: "Visceral Fat", value: parsed.visceral_fat_level ? `Level ${parsed.visceral_fat_level}` : "—" },
                ].map((item) => (
                  <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A1A26" }}>
                    <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                    <Text style={{ color: item.value === "—" ? "#4A4A6A" : "#F0F0F5", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </Card>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={{
                  backgroundColor: "#00D4AA",
                  borderRadius: 8,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#0A0A0F" />
                ) : (
                  <Feather name="save" size={18} color="#0A0A0F" />
                )}
                <Text style={{ color: "#0A0A0F", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  {isSaving ? "Saving..." : "Save InBody Data"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
