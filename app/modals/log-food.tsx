import { useState } from "react";
import { getTodayKey } from "../../lib/dates";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { parseFoodInput, type ParsedFoodItem } from "../../lib/ai/parsers";
import { insertFoodLog } from "../../lib/db/queries/nutrition";
import { useUIStore } from "../../lib/stores/ui.store";
import { Card } from "../../components/ui/Card";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import uuid from "react-native-uuid";
import { M3 } from "../../design-system/tokens";
import { success } from "../../lib/haptics";

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

function suggestedMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}

export default function LogFoodModal() {
  const params = useLocalSearchParams();
  const mealParam = params.meal as MealType | undefined;
  
  const { logFoodMeal, logFoodMode } = useUIStore();
  const [mode, setMode] = useState<"type" | "voice" | "paste">(logFoodMode);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    mealParam ?? (logFoodMeal as MealType) ?? suggestedMeal()
  );
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[] | null>(null);
  const [parseNotes, setParseNotes] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = getTodayKey();

  const handleParse = async () => {
    if (!input.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setParsedItems(null);
    try {
      const result = await parseFoodInput(input);
      setParsedItems(result.items);
      setParseNotes(result.parse_notes);
      if (result.meal_suggestion) {
        setSelectedMeal(result.meal_suggestion);
      }
    } catch (err) {
      setParseError("We couldn't parse that yet. Your text is still here — edit it or try again.");
      setParsedItems(null);
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedFoodItem, value: string) => {
    if (!parsedItems) return;
    const updated = [...parsedItems];
    const item = { ...updated[index] } as Record<string, unknown>;
    if (field === "name" || field === "quantity" || field === "confidence") {
      item[field] = value;
    } else {
      item[field] = parseFloat(value) || 0;
    }
    updated[index] = item as unknown as ParsedFoodItem;
    setParsedItems(updated);
  };

  const removeItem = (index: number) => {
    if (!parsedItems) return;
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    setIsSaving(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      for (const item of parsedItems) {
        await insertFoodLog({
          id: uuid.v4() as string,
          date: today,
          meal: selectedMeal,
          name: item.name,
          quantity_g: item.quantity_g,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          sugar_g: null,
          sodium_mg: null,
          source: mode,
          raw_input: input,
          created_at: now,
        });
      }
      success();
      setSaved(true);
      setTimeout(() => router.back(), 350);
    } catch (err) {
      Alert.alert("Save Failed", "Could not save food log. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalMacros = parsedItems?.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein_g,
      carbs: acc.carbs + item.carbs_g,
      fat: acc.fat + item.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ModalHeader title="LOG FOOD" />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Meal Selector ── */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {MEALS.map((meal) => (
              <TouchableOpacity
                key={meal}
                onPress={() => setSelectedMeal(meal)}
                style={{
                  flex: 1,
                  backgroundColor: selectedMeal === meal ? M3.colors.primaryContainer : M3.colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selectedMeal === meal ? M3.colors.primary : M3.colors.surfaceContainer,
                  padding: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: selectedMeal === meal ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                  {meal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Mode Selector ── */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["type", "paste"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  backgroundColor: mode === m ? M3.colors.surfaceVariant : M3.colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: mode === m ? M3.colors.primary : M3.colors.surfaceContainer,
                  padding: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Feather name={m === "type" ? "edit-3" : "clipboard"} size={14} color={mode === m ? M3.colors.primary : M3.colors.onSurfaceVariant} />
                <Text style={{ color: mode === m ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Input ── */}
          <View>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                mode === "type"
                  ? "e.g. 4 eggs and a bowl of dal with 2 rotis"
                  : "Paste food data from Claude or ChatGPT..."
              }
              placeholderTextColor={M3.colors.onSurfaceMuted}
              multiline
              numberOfLines={mode === "paste" ? 6 : 3}
              style={{
                backgroundColor: M3.colors.surface,
                borderRadius: 8,
                padding: 14,
                color: M3.colors.onSurface,
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                borderWidth: 1,
                borderColor: M3.colors.surfaceContainer,
                textAlignVertical: "top",
                minHeight: mode === "paste" ? 120 : 80,
              }}
            />
          </View>

          <Button
            label={isParsing ? "Parsing..." : "Parse with AI"}
            icon="cpu"
            loading={isParsing}
            disabled={!input.trim()}
            onPress={handleParse}
          />

          {parseError && (\n            <View style={{ backgroundColor: M3.colors.errorContainer, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8 }}>\n              <Feather name="alert-circle" size={16} color={M3.colors.error} />\n              <Text style={{ color: M3.colors.onErrorContainer, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{parseError}</Text>\n            </View>\n          )}\n\n          {saved && (\n            <View style={{ backgroundColor: M3.colors.successContainer, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8 }}>\n              <Feather name="check-circle" size={16} color={M3.colors.success} />\n              <Text style={{ color: M3.colors.onSuccessContainer, fontSize: 13, fontFamily: "DMSans_500Medium" }}>Food saved</Text>\n            </View>\n          )}\n\n          {/* ── Parse Notes ── */}
          {parseNotes && (
            <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 8, padding: 10, flexDirection: "row", gap: 8 }}>
              <Feather name="alert-circle" size={14} color={M3.colors.warning} />
              <Text style={{ color: M3.colors.warning, fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 }}>
                {parseNotes}
              </Text>
            </View>
          )}

          {/* ── Parsed Items ── */}
          {parsedItems && parsedItems.length > 0 && (
            <>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                CONFIRM ITEMS
              </Text>

              {parsedItems.map((item, index) => (
                <Card key={index} elevated>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {item.confidence === "low" && (
                        <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: M3.colors.warning, fontSize: 9, fontFamily: "DMSans_700Bold" }}>LOW CONF</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <Feather name="trash-2" size={14} color={M3.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { label: "Kcal", field: "calories" as const, color: M3.colors.primary },
                      { label: "P(g)", field: "protein_g" as const, color: M3.colors.secondary },
                      { label: "C(g)", field: "carbs_g" as const, color: M3.colors.success },
                      { label: "F(g)", field: "fat_g" as const, color: M3.macroColors.fat },
                    ].map(({ label, field, color }) => (
                      <View key={field} style={{ flex: 1 }}>
                        <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular", marginBottom: 3, textAlign: "center" }}>
                          {label}
                        </Text>
                        <TextInput
                          value={String(item[field] ?? 0)}
                          onChangeText={(v) => updateItem(index, field, v)}
                          keyboardType="decimal-pad"
                          style={{
                            backgroundColor: M3.colors.background,
                            borderRadius: 6,
                            padding: 6,
                            color,
                            fontSize: 14,
                            fontFamily: "BebasNeue_400Regular",
                            borderWidth: 1,
                            borderColor: M3.colors.surfaceContainer,
                            textAlign: "center",
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </Card>
              ))}

              {/* Total */}
              {totalMacros && (
                <Card>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
                    TOTAL
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: M3.colors.primary, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      {totalMacros.calories.toFixed(0)} kcal
                    </Text>
                    <Text style={{ color: M3.colors.secondary, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      P: {totalMacros.protein.toFixed(0)}g
                    </Text>
                    <Text style={{ color: M3.colors.success, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      C: {totalMacros.carbs.toFixed(0)}g
                    </Text>
                    <Text style={{ color: M3.macroColors.fat, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      F: {totalMacros.fat.toFixed(0)}g
                    </Text>
                  </View>
                </Card>
              )}

              <Button
                label={isSaving ? "Saving..." : `Log to ${selectedMeal}`}
                icon="check"
                loading={isSaving}
                onPress={handleSave}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
