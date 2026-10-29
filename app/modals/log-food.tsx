import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { parseFoodInput, type ParsedFoodItem } from "../../lib/ai/parsers";
import { AiError } from "../../lib/ai/gateway";
import { AI_SAFETY_RESPONSE } from "../../lib/ai/riskPhrases";
import { insertFoodLogs } from "../../lib/data";
import { searchLocalFoods, type IndianFood } from "../../lib/data/indianFoodDB";
import { Card } from "../../components/ui/Card";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import uuid from "react-native-uuid";
import { M3 } from "../../design-system/tokens";
import { logger } from "../../lib/logger";
import { useToday } from "../../lib/time/useToday";
import { localDateParam } from "../../lib/time/localDate";
import { nowUnix } from "../../lib/time/clock";
import { createManualFoodDraft, isValidFoodLog } from "../../lib/domain/nutrition";

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function LogFoodModal() {
  const { show } = useToast();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const mealParam = MEALS.find((meal) => meal === params.meal);
  
  const today = useToday();
  const [mode, setMode] = useState<"type" | "voice" | "paste">("type");
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    mealParam ?? "breakfast"
  );
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[] | null>(null);
  const [itemSource, setItemSource] = useState<"ai" | "local" | "manual">("manual");
  const [parseNotes, setParseNotes] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const logDate = localDateParam(params.date, today);
  const localSuggestions = parsedItems ? [] : searchLocalFoods(input);

  const makeManualItem = (name: string): ParsedFoodItem => ({
    ...createManualFoodDraft(name),
    quantity: "100 g",
    quantity_g: 100,
    fiber_g: null,
    confidence: "low",
    needs_review: false,
  });

  const chooseLocalFood = (food: IndianFood) => {
    setItemSource("local");
    setParsedItems([{
      name: food.name,
      quantity: "100 g",
      quantity_g: 100,
      calories: food.per100g.calories,
      protein_g: food.per100g.protein,
      carbs_g: food.per100g.carbs,
      fat_g: food.per100g.fat,
      fiber_g: food.per100g.fiber,
      confidence: food.dataQuality === "consistent" ? "high" : "medium",
      needs_review: false,
    }]);
    setParseNotes(food.warning ?? null);
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    setIsParsing(true);
    setParsedItems(null);
    try {
      const result = await parseFoodInput(input);
      if (result.items.length === 0) {
        setItemSource("manual");
        setParsedItems([makeManualItem(input.trim())]);
        setParseNotes(result.parse_notes || "No items were identified. Enter the nutrition values to continue.");
      } else {
        setItemSource("ai");
        setParsedItems(result.items);
        setParseNotes(result.parse_notes);
      }
      if (result.meal_suggestion) {
        setSelectedMeal(result.meal_suggestion);
      }
    } catch (err) {
      if (err instanceof AiError && err.code === "consent") {
        router.push("/modals/ai-consent");
      }
      if (err instanceof AiError && err.code === "safety") {
        setParseNotes(AI_SAFETY_RESPONSE);
        setParsedItems(null);
        show({ message: AI_SAFETY_RESPONSE, kind: "info" });
        return;
      }
      // Fallback: show raw input as editable
      show({
        message: "Could not parse food automatically. You can add items manually.",
        kind: "error",
      });
      // Create a basic item from the input
      setItemSource("manual");
      setParsedItems([makeManualItem(input.trim())]);
      setParseNotes("AI parsing failed. Enter the nutrition values manually before saving.");
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedFoodItem, value: string) => {
    if (!parsedItems) return;
    const updated = [...parsedItems];
    const existing = updated[index];
    if (!existing) return;
    const item = { ...existing } as Record<string, unknown>;
    if (field === "name" || field === "quantity" || field === "confidence") {
      item[field] = value;
    } else {
      item[field] = value.trim() === "" ? Number.NaN : Number(value);
    }
      item.needs_review = [item.calories, item.protein_g, item.carbs_g, item.fat_g].every(
        (macro) => typeof macro === "number" && Number.isFinite(macro),
      ) &&
        Math.abs(
          Number(item.calories) -
          (4 * Number(item.protein_g) + 4 * Number(item.carbs_g) + 9 * Number(item.fat_g)),
        ) > 0.3 * Number(item.calories) + 20;
    updated[index] = item as unknown as ParsedFoodItem;
    setParsedItems(updated);
  };

  const removeItem = (index: number) => {
    if (!parsedItems) return;
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!parsedItems || !canSaveItems) return;
    setIsSaving(true);
    try {
      const now = nowUnix();
      await insertFoodLogs(parsedItems.map((item) => ({
          id: uuid.v4() as string,
          date: logDate,
          meal: selectedMeal,
          name: item.name,
          quantity_g: item.quantity_g,
          calories: item.calories,
          protein_g: Number.isFinite(item.protein_g) ? item.protein_g : 0,
          carbs_g: Number.isFinite(item.carbs_g) ? item.carbs_g : 0,
          fat_g: Number.isFinite(item.fat_g) ? item.fat_g : 0,
          fiber_g: item.fiber_g,
          sugar_g: null,
          sodium_mg: null,
          source: itemSource,
          raw_input: input,
          created_at: now,
        })));
      show({ message: "Food entry saved.", kind: "success" });
      router.back();
    } catch (error) {
      logger.error("Food log save failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({ message: "Could not save food log. Please try again.", kind: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const totalMacros = parsedItems?.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number.isFinite(item.calories) ? item.calories : 0),
      protein: acc.protein + (Number.isFinite(item.protein_g) ? item.protein_g : 0),
      carbs: acc.carbs + (Number.isFinite(item.carbs_g) ? item.carbs_g : 0),
      fat: acc.fat + (Number.isFinite(item.fat_g) ? item.fat_g : 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const canSaveItems =
    parsedItems !== null &&
    parsedItems.length > 0 &&
    parsedItems.every((item) =>
      isValidFoodLog({
        name: item.name,
        calories: item.calories,
        protein_g: Number.isFinite(item.protein_g) ? item.protein_g : 0,
        carbs_g: Number.isFinite(item.carbs_g) ? item.carbs_g : 0,
        fat_g: Number.isFinite(item.fat_g) ? item.fat_g : 0,
      }),
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

          {localSuggestions.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                OFFLINE FOOD MATCHES
              </Text>
              {localSuggestions.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  onPress={() => chooseLocalFood(food)}
                  style={{ backgroundColor: M3.colors.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: M3.colors.surfaceContainer }}
                >
                  <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold" }}>{food.name}</Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11 }}>
                    {food.per100g.calories} kcal · P {food.per100g.protein}g · C {food.per100g.carbs}g · F {food.per100g.fat}g per 100 g
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            label={isParsing ? "Parsing..." : "Parse with AI"}
            icon="cpu"
            loading={isParsing}
            disabled={!input.trim()}
            onPress={handleParse}
          />

          {/* ── Parse Notes ── */}
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
                      <TextInput
                        value={item.name}
                        onChangeText={(value) => updateItem(index, "name", value)}
                        accessibilityLabel="Food name"
                        style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold", padding: 0 }}
                      />
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {itemSource === "ai" && (
                        <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: M3.colors.warning, fontSize: 9, fontFamily: "DMSans_700Bold" }}>AI ESTIMATE · {item.confidence.toUpperCase()}</Text>
                        </View>
                      )}
                      {itemSource === "local" && (
                        <Text style={{ color: M3.colors.success, fontSize: 9, fontFamily: "DMSans_700Bold" }}>LOCAL</Text>
                      )}
                      {item.needs_review && (
                        <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: M3.colors.warning, fontSize: 9, fontFamily: "DMSans_700Bold" }}>REVIEW ESTIMATE</Text>
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
                          value={Number.isFinite(item[field]) ? String(item[field]) : ""}
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
                disabled={!canSaveItems}
                onPress={handleSave}
              />
              {!canSaveItems && (
                <Text style={{ color: M3.colors.warning, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  Enter a name and calories above zero. Blank macros are saved as zero.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
