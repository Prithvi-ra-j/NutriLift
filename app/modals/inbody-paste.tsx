import { useState } from "react";
import { getTodayKey } from "../../lib/dates";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { parseInBodyText, type InBodyParseResult } from "../../lib/ai/parsers";
import { insertBodyStat } from "../../lib/db/queries/body";
import { Card } from "../../components/ui/Card";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import { M3 } from "../../design-system/tokens";
import uuid from "react-native-uuid";

export default function InBodyPasteModal() {
  const [pasteText, setPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<InBodyParseResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dateOverride, setDateOverride] = useState(getTodayKey());

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
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ModalHeader title="IMPORT INBODY" subtitle="Paste a report and let AI extract the numbers" />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            Paste your InBody report text below. You can get this by asking Claude or ChatGPT to extract the data from your InBody PDF.
          </Text>

          <TextInput
            value={pasteText}
            onChangeText={setPasteText}
            placeholder="Paste InBody report text here..."
            placeholderTextColor={M3.colors.onSurfaceMuted}
            multiline
            numberOfLines={10}
            style={{
              backgroundColor: M3.colors.surface,
              borderRadius: M3.shape.medium,
              padding: 14,
              color: M3.colors.onSurface,
              fontSize: 13,
              fontFamily: "DMSans_400Regular",
              borderWidth: 1,
              borderColor: M3.colors.outline,
              textAlignVertical: "top",
              minHeight: 180,
            }}
          />

          <Button
            label={isParsing ? "Parsing..." : "Extract Data"}
            icon="cpu"
            loading={isParsing}
            disabled={!pasteText.trim()}
            onPress={handleParse}
          />

          {parsed && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{
                  backgroundColor: parsed.parse_confidence === "high" ? M3.colors.successContainer : parsed.parse_confidence === "medium" ? M3.colors.warningContainer : M3.colors.errorContainer,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                  <Text style={{
                    color: parsed.parse_confidence === "high" ? M3.colors.success : parsed.parse_confidence === "medium" ? M3.colors.warning : M3.colors.error,
                    fontSize: 10,
                    fontFamily: "DMSans_700Bold",
                    textTransform: "uppercase",
                  }}>
                    {parsed.parse_confidence} confidence
                  </Text>
                </View>
                {parsed.missing_fields.length > 0 && (
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                    {parsed.missing_fields.length} fields missing
                  </Text>
                )}
              </View>

              {/* Date */}
              <View>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                  Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={dateOverride}
                  onChangeText={setDateOverride}
                  style={{
                    backgroundColor: M3.colors.surface,
                    borderRadius: M3.shape.medium,
                    padding: 12,
                    color: M3.colors.onSurface,
                    fontSize: 14,
                    fontFamily: "DMSans_400Regular",
                    borderWidth: 1,
                    borderColor: M3.colors.outline,
                  }}
                />
              </View>

              <Card>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
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
                  <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                    <Text style={{ color: item.value === "—" ? M3.colors.onSurfaceMuted : M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </Card>

              <Button label={isSaving ? "Saving..." : "Save InBody Data"} icon="save" loading={isSaving} onPress={handleSave} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
