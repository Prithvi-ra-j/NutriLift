import { useEffect, useMemo, useState } from "react";
import { getTodayKey } from "../../../lib/dates";
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
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { parseFoodInput, type ParsedFoodItem } from "../../../lib/ai/parsers";
import { insertFoodLog, getDistinctRecentFoods, getMostRecentMealLogsBeforeDate } from "../../../lib/db/queries/nutrition";
import { useUIStore } from "../../../lib/stores/ui.store";
import { Card } from "../../../components/ui/Card";
import { ModalHeader } from "../../../components/ui/ModalHeader";
import { Button } from "../../../components/ui/Button";
import uuid from "react-native-uuid";
import { M3 } from "../../../design-system/tokens";
import { PressableScale } from "../../../components/ui/PressableScale";
import { success } from "../../../lib/haptics";
import { INDIAN_FOOD_DB } from "../../../lib/data/indianFoodDB";

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
  const [mode, setMode] = useState<"type" | "paste" | "manual">(logFoodMode === "paste" ? "paste" : "type");
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
  const [savedMeal, setSavedMeal] = useState<MealType | null>(null);
  const [savedCalories, setSavedCalories] = useState(0);
  const [savedProtein, setSavedProtein] = useState(0);
  const [recentFoods, setRecentFoods] = useState<import("../../../lib/db/schema").FoodLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");

  const today = getTodayKey();

  useEffect(() => { getDistinctRecentFoods(8).then(setRecentFoods).catch(() => setRecentFoods([])); }, []);
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return INDIAN_FOOD_DB.filter((food) => [food.name, ...food.aliases].some((name) => name.toLowerCase().includes(q))).slice(0, 8);
  }, [searchQuery]);

  const handleLocalFoodAdd = async (food: (typeof INDIAN_FOOD_DB)[number]) => {
    const serving = food.commonServings[1] ?? food.commonServings[0];
    const grams = serving?.grams ?? 100;
    const factor = grams / 100;
    await handleQuickAdd({
      id: uuid.v4() as string,
      date: today,
      meal: selectedMeal,
      name: food.name,
      quantity_g: grams,
      calories: food.per100g.calories * factor,
      protein_g: food.per100g.protein * factor,
      carbs_g: food.per100g.carbs * factor,
      fat_g: food.per100g.fat * factor,
      fiber_g: food.per100g.fiber * factor,
      sugar_g: null,
      sodium_mg: null,
      source: "manual",
      raw_input: searchQuery,
      created_at: Math.floor(Date.now() / 1000),
    } as import("../../../lib/db/schema").FoodLog);
  };

  const handleRepeatMeal = async () => {
    setIsSaving(true);
    setParseError(null);
    try {
      const previous = await getMostRecentMealLogsBeforeDate(selectedMeal, today);
      if (previous.length === 0) {
        setParseError("No previous meal is available to repeat yet.");
        return;
      }
      for (const food of previous) {
        await insertFoodLog({ ...food, id: uuid.v4() as string, date: today, meal: selectedMeal, created_at: Math.floor(Date.now() / 1000) });
      }
      setSavedMeal(selectedMeal);
      setSavedCalories(previous.reduce((sum, food) => sum + food.calories, 0));
      setSavedProtein(previous.reduce((sum, food) => sum + food.protein_g, 0));
      success();
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch {
      setParseError("Unable to repeat that meal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };



  const handleQuickAdd = async (food: import("../../../lib/db/schema").FoodLog) => {
    setIsSaving(true);
    try {
      await insertFoodLog({ ...food, id: uuid.v4() as string, date: today, meal: selectedMeal, created_at: Math.floor(Date.now() / 1000) });
      success();
      setSavedMeal(selectedMeal);
      setSavedCalories(food.calories);
      setSavedProtein(food.protein_g);
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch {
      setParseError("Couldn't save that food. Please try again.");
    } finally { setIsSaving(false); }
  };

  const handleManualSave = async () => {
    if (!manualName.trim()) {
      setParseError("Add a food name before saving.");
      return;
    }
    const values = [manualCalories, manualProtein, manualCarbs, manualFat].map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 0) || values[0] === 0) {
      setParseError("Enter valid calorie and macro values.");
      return;
    }
    setIsSaving(true);
    setParseError(null);
    try {
      await insertFoodLog({
        id: uuid.v4() as string,
        date: today,
        meal: selectedMeal,
        name: manualName.trim(),
        quantity_g: null,
        calories: values[0],
        protein_g: values[1],
        carbs_g: values[2],
        fat_g: values[3],
        fiber_g: null,
        sugar_g: null,
        sodium_mg: null,
        source: "manual",
        raw_input: manualName.trim(),
        created_at: Math.floor(Date.now() / 1000),
      });
      success();
      setSavedMeal(selectedMeal);
      setSavedCalories(values[0]);
      setSavedProtein(values[1]);
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch {
      setParseError("Couldn't save that food. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
              <PressableScale
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
                <Text style={{ color: selectedMeal === meal ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                  {meal}
                </Text>
              </PressableScale>
            ))}
          </View>

          {recentFoods.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ flex: 1, color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>Recent</Text>
                <PressableScale onPress={handleRepeatMeal} accessibilityRole="button" accessibilityLabel={`Repeat previous ${selectedMeal}`} style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: M3.shape.full, backgroundColor: M3.colors.primaryContainer, justifyContent: "center" }}><Text style={{ color: M3.colors.primary, fontSize: 12, fontFamily: "DMSans_500Medium" }}>Repeat {selectedMeal}</Text></PressableScale>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recentFoods.map(food => (
                  <PressableScale key={food.id} onPress={() => handleQuickAdd(food)} haptic accessibilityRole="button" accessibilityLabel={`Add ${food.name}`} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: M3.colors.surfaceVariant, borderWidth: 1, borderColor: M3.colors.outline, justifyContent: "center" }}>
                    <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_500Medium", fontSize: 13 }}>{food.name}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>
          )}


          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="search" size={18} color={M3.colors.primary} />
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search foods" placeholderTextColor={M3.colors.onSurfaceMuted} style={{ flex: 1, height: 44, color: M3.colors.onSurface, fontSize: 15 }} />
            </View>
            {searchResults.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                {searchResults.map((food) => (
                  <PressableScale key={food.name} onPress={() => void handleLocalFoodAdd(food)} haptic accessibilityRole="button" accessibilityLabel={"Add " + food.name} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, borderRadius: M3.shape.small, backgroundColor: M3.colors.surfaceVariant }}>
                    <Text style={{ color: M3.colors.onSurface, ...M3.typescale.bodyMedium }}>{food.name}</Text>
                    <Feather name="plus-circle" size={18} color={M3.colors.primary} />
                  </PressableScale>
                ))}
              </View>
            )}
          </Card>

          {/* ── Entry methods ── */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>Add food</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                ["type", "edit-3", "Describe"],
                ["manual", "edit", "Manual"],
              ].map(([key, icon, label]) => (
                <PressableScale key={key} onPress={() => setMode(key as "type" | "manual")} accessibilityRole="button" style={{ flex: 1, minHeight: 54, borderRadius: M3.shape.medium, backgroundColor: mode === key ? M3.colors.primaryContainer : M3.colors.surface, borderWidth: 1, borderColor: mode === key ? M3.colors.primary : M3.colors.outline, alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Feather name={icon as React.ComponentProps<typeof Feather>["name"]} size={18} color={mode === key ? M3.colors.primary : M3.colors.onSurfaceVariant} />
                  <Text style={{ color: mode === key ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>{label}</Text>
                </PressableScale>
              ))}
              <PressableScale onPress={() => router.push("/modals/barcode-scanner")} accessibilityRole="button" accessibilityLabel="Scan barcode" style={{ flex: 1, minHeight: 54, borderRadius: M3.shape.medium, backgroundColor: M3.colors.surface, borderWidth: 1, borderColor: M3.colors.outline, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Feather name="camera" size={18} color={M3.colors.onSurfaceVariant} />
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>Scan</Text>
              </PressableScale>
              <PressableScale onPress={() => router.push("/modals/voice-input")} accessibilityRole="button" accessibilityLabel="Log food by voice" style={{ flex: 1, minHeight: 54, borderRadius: M3.shape.medium, backgroundColor: M3.colors.surface, borderWidth: 1, borderColor: M3.colors.outline, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Feather name="mic" size={18} color={M3.colors.onSurfaceVariant} />
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>Voice</Text>
              </PressableScale>
            </View>
            <PressableScale onPress={() => setMode("paste")} accessibilityRole="button" style={{ minHeight: 48, borderRadius: M3.shape.medium, backgroundColor: mode === "paste" ? M3.colors.primaryContainer : M3.colors.surface, borderWidth: 1, borderColor: mode === "paste" ? M3.colors.primary : M3.colors.outline, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Feather name="clipboard" size={17} color={mode === "paste" ? M3.colors.primary : M3.colors.onSurfaceVariant} />
              <Text style={{ color: mode === "paste" ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>Paste / structured input</Text>
            </PressableScale>
          </View>

          {/* ── Input ── */}
          {mode === "manual" ? (
            <Card>
              <TextInput value={manualName} onChangeText={setManualName} placeholder="Food name" placeholderTextColor={M3.colors.onSurfaceMuted} style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, padding: 12, color: M3.colors.onSurface, fontSize: 15 }} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {[
                  ["Calories", manualCalories, setManualCalories],
                  ["Protein", manualProtein, setManualProtein],
                  ["Carbs", manualCarbs, setManualCarbs],
                  ["Fat", manualFat, setManualFat],
                ].map(([label, value, setter]) => (
                  <View key={label as string} style={{ width: "48%" }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, marginBottom: 4 }}>{label as string}</Text>
                    <TextInput value={value as string} onChangeText={setter as (v: string) => void} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={M3.colors.onSurfaceMuted} style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, padding: 10, color: M3.colors.onSurface, fontSize: 14 }} />
                  </View>
                ))}
              </View>
              <Button label={isSaving ? "Saving..." : "Save manual food"} icon="save" loading={isSaving} onPress={handleManualSave} />
            </Card>
          ) : (
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


          )}
          {mode !== "manual" && <Button
            label={isParsing ? "Parsing..." : "Parse with AI"}
            icon="cpu"
            loading={isParsing}
            disabled={!input.trim()}
            onPress={handleParse}
          />}

          {parseError && (
            <View style={{ backgroundColor: M3.colors.errorContainer, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8 }}>
              <Feather name="alert-circle" size={16} color={M3.colors.error} />
              <Text style={{ color: M3.colors.onErrorContainer, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{parseError}</Text>
            </View>
          )}

          {saved && (
            <View style={{ backgroundColor: M3.colors.successContainer, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8 }}>
              <Feather name="check-circle" size={16} color={M3.colors.success} />
              <View style={{ flex: 1 }}><Text style={{ color: M3.colors.onSuccessContainer, fontSize: 14, fontFamily: "DMSans_700Bold" }}>Added {savedMeal ?? selectedMeal}</Text><Text style={{ color: M3.colors.onSuccessContainer, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>+ {savedProtein.toFixed(0)}g protein · + {savedCalories.toFixed(0)} kcal</Text></View>
            </View>
          )}

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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                CONFIRM ITEMS
              </Text>

              {parsedItems.map((item, index) => (
                <Card key={index} elevated>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {item.confidence === "low" && (
                        <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: M3.colors.warning, fontSize: 12, fontFamily: "DMSans_700Bold" }}>LOW CONF</Text>
                        </View>
                      )}
                      <PressableScale onPress={() => removeItem(index)}>
                        <Feather name="trash-2" size={14} color={M3.colors.error} />
                      </PressableScale>
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
                        <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 3, textAlign: "center" }}>
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
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
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
