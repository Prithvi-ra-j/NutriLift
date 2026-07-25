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
import { router, useLocalSearchParams } from "expo-router";
import { parseFoodInput, type ParsedFoodItem } from "../../lib/ai/parsers";
import { insertFoodLog } from "../../lib/db/queries/nutrition";
import { useUIStore } from "../../lib/stores/ui.store";
import { Card } from "../../components/ui/Card";
import uuid from "react-native-uuid";

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function LogFoodModal() {
  const params = useLocalSearchParams();
  const mealParam = params.meal as MealType | undefined;
  
  const { logFoodMeal, logFoodMode } = useUIStore();
  const [mode, setMode] = useState<"type" | "voice" | "paste">(logFoodMode);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    mealParam ?? (logFoodMeal as MealType) ?? "breakfast"
  );
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[] | null>(null);
  const [parseNotes, setParseNotes] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const handleParse = async () => {
    if (!input.trim()) return;
    setIsParsing(true);
    setParsedItems(null);
    try {
      const result = await parseFoodInput(input);
      setParsedItems(result.items);
      setParseNotes(result.parse_notes);
      if (result.meal_suggestion) {
        setSelectedMeal(result.meal_suggestion);
      }
    } catch (err) {
      // Fallback: show raw input as editable
      Alert.alert(
        "Parse Failed",
        "Could not parse food automatically. You can add items manually.",
        [{ text: "OK" }]
      );
      // Create a basic item from the input
      setParsedItems([
        {
          name: input,
          quantity: "1 serving",
          quantity_g: null,
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: null,
          confidence: "low",
        },
      ]);
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
      router.back();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 }}>
          <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
            LOG FOOD
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
          {/* ── Meal Selector ── */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {MEALS.map((meal) => (
              <TouchableOpacity
                key={meal}
                onPress={() => setSelectedMeal(meal)}
                style={{
                  flex: 1,
                  backgroundColor: selectedMeal === meal ? "#00D4AA22" : "#12121A",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selectedMeal === meal ? "#00D4AA" : "#252535",
                  padding: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: selectedMeal === meal ? "#00D4AA" : "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
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
                  backgroundColor: mode === m ? "#1A1A26" : "#12121A",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: mode === m ? "#00D4AA" : "#252535",
                  padding: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Feather name={m === "type" ? "edit-3" : "clipboard"} size={14} color={mode === m ? "#00D4AA" : "#8080A0"} />
                <Text style={{ color: mode === m ? "#00D4AA" : "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
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
              placeholderTextColor="#4A4A6A"
              multiline
              numberOfLines={mode === "paste" ? 6 : 3}
              style={{
                backgroundColor: "#12121A",
                borderRadius: 8,
                padding: 14,
                color: "#F0F0F5",
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                borderWidth: 1,
                borderColor: "#252535",
                textAlignVertical: "top",
                minHeight: mode === "paste" ? 120 : 80,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleParse}
            disabled={!input.trim() || isParsing}
            style={{
              backgroundColor: input.trim() && !isParsing ? "#00D4AA" : "#1A1A26",
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
              <Feather name="cpu" size={16} color={input.trim() ? "#0A0A0F" : "#4A4A6A"} />
            )}
            <Text style={{ color: input.trim() && !isParsing ? "#0A0A0F" : "#4A4A6A", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
              {isParsing ? "Parsing..." : "Parse with AI"}
            </Text>
          </TouchableOpacity>

          {/* ── Parse Notes ── */}
          {parseNotes && (
            <View style={{ backgroundColor: "#FFB80022", borderRadius: 8, padding: 10, flexDirection: "row", gap: 8 }}>
              <Feather name="alert-circle" size={14} color="#FFB800" />
              <Text style={{ color: "#FFB800", fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 }}>
                {parseNotes}
              </Text>
            </View>
          )}

          {/* ── Parsed Items ── */}
          {parsedItems && parsedItems.length > 0 && (
            <>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                CONFIRM ITEMS
              </Text>

              {parsedItems.map((item, index) => (
                <Card key={index} elevated>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {item.confidence === "low" && (
                        <View style={{ backgroundColor: "#FFB80022", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: "#FFB800", fontSize: 9, fontFamily: "DMSans_700Bold" }}>LOW CONF</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <Feather name="trash-2" size={14} color="#FF4757" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { label: "Kcal", field: "calories" as const, color: "#00D4AA" },
                      { label: "P(g)", field: "protein_g" as const, color: "#3B82F6" },
                      { label: "C(g)", field: "carbs_g" as const, color: "#22C55E" },
                      { label: "F(g)", field: "fat_g" as const, color: "#F59E0B" },
                    ].map(({ label, field, color }) => (
                      <View key={field} style={{ flex: 1 }}>
                        <Text style={{ color: "#4A4A6A", fontSize: 9, fontFamily: "DMSans_400Regular", marginBottom: 3, textAlign: "center" }}>
                          {label}
                        </Text>
                        <TextInput
                          value={String(item[field] ?? 0)}
                          onChangeText={(v) => updateItem(index, field, v)}
                          keyboardType="decimal-pad"
                          style={{
                            backgroundColor: "#0A0A0F",
                            borderRadius: 6,
                            padding: 6,
                            color,
                            fontSize: 14,
                            fontFamily: "BebasNeue_400Regular",
                            borderWidth: 1,
                            borderColor: "#252535",
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
                  <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
                    TOTAL
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#00D4AA", fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      {totalMacros.calories.toFixed(0)} kcal
                    </Text>
                    <Text style={{ color: "#3B82F6", fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      P: {totalMacros.protein.toFixed(0)}g
                    </Text>
                    <Text style={{ color: "#22C55E", fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      C: {totalMacros.carbs.toFixed(0)}g
                    </Text>
                    <Text style={{ color: "#F59E0B", fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      F: {totalMacros.fat.toFixed(0)}g
                    </Text>
                  </View>
                </Card>
              )}

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
                  <Feather name="check" size={18} color="#0A0A0F" />
                )}
                <Text style={{ color: "#0A0A0F", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  {isSaving ? "Saving..." : `Log to ${selectedMeal}`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
