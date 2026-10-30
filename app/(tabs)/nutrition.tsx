import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTodayStore } from "../../lib/stores/today.store";
import {
  getDailyNutrition,
  getMealSummary,
  deleteFoodLog,
  getLast7DaysNutrition,
  setNutritionDayComplete,
  getFavoriteFoods,
  addFavoriteFoodFromLog,
  logFavoriteFood,
  removeFavoriteFood,
  getRepeatableMeals,
  saveRepeatableMealFromLogs,
  repeatMeal,
  setFoodEstimateReviewed,
} from "../../lib/db/queries/nutrition";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { DEFAULT_NUTRITION_TARGETS, getNutritionTargets, type NutritionTargets } from "../../lib/db/queries/nutrition-targets";
import { Card } from "../../components/ui/Card";
import { MacroBar } from "../../components/ui/MacroBar";
import { QuickAddSheet } from "../../components/ui/QuickAddSheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { DateNavigator } from "../../components/ui/DateNavigator";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { FoodLog, DailyNutrition } from "../../lib/db/schema";
import type { MealSummary } from "../../lib/db/queries/nutrition";
import { M3 } from "../../design-system/tokens";
import { fromLocalDateKey, toLocalDateKey } from "../../lib/utils/local-date";

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
type MealGroup = Omit<MealSummary, "meal"> & { meal: MealType };
const MEAL_ICONS: Record<MealType, React.ComponentProps<typeof Feather>["name"]> = {
  breakfast: "sunrise",
  lunch: "sun",
  snack: "coffee",
  dinner: "moon",
};


export default function NutritionScreen() {
  const todayStr = toLocalDateKey();
  const params = useLocalSearchParams<{ date?: string }>();
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const [selectedDate, setSelectedDate] = useState(() => {
    try { if (requestedDate) fromLocalDateKey(requestedDate); return requestedDate || todayStr; }
    catch { return todayStr; }
  });
  useEffect(() => {
    if (!requestedDate) return;
    try { fromLocalDateKey(requestedDate); setSelectedDate(requestedDate); } catch { /* Ignore unsupported deep-link dates. */ }
  }, [requestedDate]);
  const { nutrition, foodLogs, setNutrition, setFoodLogs } = useTodayStore();

  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTargets, setActiveTargets] = useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);
  const [last7Days, setLast7Days] = useState<DailyNutrition[]>([]);
  const [mealGroups, setMealGroups] = useState<MealGroup[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<Awaited<ReturnType<typeof getFavoriteFoods>>>([]);
  const [repeatableMeals, setRepeatableMeals] = useState<Array<{ id: string; name: string; meal: string; created_at: string; updated_at: string; itemCount: number }>>([]);

  const loadData = useCallback(async () => {
    try {
      const [nutritionData, mealData, weekData, targets, favoriteData, repeatableData] = await Promise.all([
        getDailyNutrition(selectedDate),
        getMealSummary(selectedDate),
        getLast7DaysNutrition(),
        getNutritionTargets(),
        getFavoriteFoods("", 12),
        getRepeatableMeals("", 8),
      ]);
      const completeMealGroups: MealGroup[] = MEALS.map((meal) => {
        const existing = mealData.find((group) => group.meal === meal);
        return existing
          ? { ...existing, meal }
          : { meal, items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
      });
      setActiveTargets(targets);
      setNutrition(nutritionData);
      setMealGroups(completeMealGroups);
      setFoodLogs(completeMealGroups.flatMap((group) => group.items));
      setLast7Days(weekData);
      setFavoriteFoods(favoriteData);
      setRepeatableMeals(repeatableData);
    } catch (err) {
      console.error("Nutrition load error:", err);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const handleDeleteFood = (log: FoodLog) => {
    Alert.alert("Delete Food", `Remove "${log.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFoodLog(log.id, selectedDate);
          loadData();
        },
      },
    ]);
  };

  const handleToggleDayComplete = async () => {
    const nextComplete = nutrition?.is_complete !== 1;
    try {
      await setNutritionDayComplete(selectedDate, nextComplete);
      await loadData();
    } catch (error) {
      Alert.alert("Could not update day status", error instanceof Error ? error.message : "The nutrition day could not be updated.");
    }
  };
  const handleReviewEstimate = (item: FoodLog) => {
    Alert.alert(
      "Review AI estimate",
      item.name + "\n" + item.calories.toFixed(0) + " kcal · P " + item.protein_g.toFixed(1) + "g · C " + item.carbs_g.toFixed(1) + "g · F " + item.fat_g.toFixed(1) + "g\n\nConfirm only if the quantity and nutrient values look right.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Confirm estimate", onPress: async () => {
          try { await setFoodEstimateReviewed(item.id, true); await loadData(); }
          catch (error) { Alert.alert("Could not review estimate", error instanceof Error ? error.message : "Try again."); }
        } },
      ],
    );
  };

  const handleAddFavorite = async (item: FoodLog) => {
    try {
      await addFavoriteFoodFromLog(item.id);
      await loadData();
      Alert.alert("Saved to quick log", item.name + " is now in your favourites.");
    } catch (error) {
      Alert.alert("Could not save favourite", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleLogFavorite = async (favoriteId: string, name: string) => {
    try {
      await logFavoriteFood(favoriteId, selectedDate);
      await loadData();
      Alert.alert("Food logged", name + " was added to " + selectedDate + ".");
    } catch (error) {
      Alert.alert("Could not log favourite", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleRepeatMeal = async (templateId: string, name: string) => {
    try {
      await repeatMeal(templateId, selectedDate);
      await loadData();
      Alert.alert("Meal repeated", name + " was added to " + selectedDate + ".");
    } catch (error) {
      Alert.alert("Could not repeat meal", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleSaveMealTemplates = async () => {
    const groupsWithItems = mealGroups.filter((group) => group.items.length > 0);
    if (groupsWithItems.length === 0) {
      Alert.alert("Nothing to save", "Log at least one meal item before creating a repeatable meal.");
      return;
    }
    try {
      for (const group of groupsWithItems) {
        await saveRepeatableMealFromLogs(group.meal + " · " + selectedDate, group.meal, group.items.map((item) => item.id));
      }
      await loadData();
      Alert.alert("Meals saved", groupsWithItems.length + " reusable meal template(s) saved.");
    } catch (error) {
      Alert.alert("Could not save meals", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleRemoveFavorite = (favoriteId: string, name: string) => {
    Alert.alert("Remove favourite", "Remove " + name + " from quick log?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await removeFavoriteFood(favoriteId); await loadData(); }
        catch (error) { Alert.alert("Could not remove favourite", error instanceof Error ? error.message : "Try again."); }
      } },
    ]);
  };

  const toggleMeal = (meal: MealType) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });
  };

  const calories = nutrition?.total_calories ?? 0;
  const protein = nutrition?.total_protein_g ?? 0;
  const carbs = nutrition?.total_carbs_g ?? 0;
  const fat = nutrition?.total_fat_g ?? 0;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <View style={{ padding: 20, gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={M3.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <ScreenHeader
          title="NUTRITION"
          subtitle={fromLocalDateKey(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          actionIcon="plus"
          actionLabel="Log Food"
          onAction={() => setQuickAddVisible(true)}
        />

        {/* ── Date Navigator ── */}
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} showFullDate={false} />

        {/* ── Marathon Day Notice ── */}
        {fromLocalDateKey(selectedDate).getDay() === 0 && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
              <Feather name="activity" size={20} color={M3.colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.error, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                  MARATHON DAY
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                  Focus on recovery and light nutrition
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Daily Macro Summary ── */}
        <Card>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 48, fontFamily: "BebasNeue_400Regular" }}>
              {calories.toFixed(0)}
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: -4 }}>
              of {activeTargets.calories} kcal
            </Text>
          </View>
          <MacroBar label="Protein" current={protein} target={activeTargets.protein_g} color={M3.colors.secondary} />
          <MacroBar label="Carbs" current={carbs} target={activeTargets.carbs_g} color={M3.colors.success} />
          <MacroBar label="Fat" current={fat} target={activeTargets.fat_g} color={M3.macroColors.fat} />
        </Card>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name={nutrition?.is_complete === 1 ? "check-circle" : "circle"} size={20}
              color={nutrition?.is_complete === 1 ? M3.colors.success : M3.colors.onSurfaceVariant} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                {nutrition?.is_complete === 1 ? "Day reviewed" : "Review this day"}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
                Confirm that the food log is complete and entries have been reviewed. Adaptive targets use only days you explicitly mark complete.
              </Text>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button"
            accessibilityState={{ disabled: foodLogs.length === 0 || selectedDate > todayStr }}
            disabled={foodLogs.length === 0 || selectedDate > todayStr}
            onPress={handleToggleDayComplete}
            style={{ marginTop: 12, paddingVertical: 11, borderRadius: M3.shape.medium, alignItems: "center",
              backgroundColor: nutrition?.is_complete === 1 ? M3.colors.surfaceVariant : M3.colors.primary,
              opacity: foodLogs.length === 0 || selectedDate > todayStr ? 0.45 : 1 }}>
            <Text style={{ color: nutrition?.is_complete === 1 ? M3.colors.onSurface : M3.colors.onPrimary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
              {nutrition?.is_complete === 1 ? "Mark as incomplete" : "Mark day complete"}
            </Text>
          </TouchableOpacity>
        </Card>
        {/* ── Log Mode Buttons ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["type", "voice", "paste", "scan"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                if (mode === "scan") {
                  router.push("/modals/barcode-scanner");
                } else if (mode === "voice") {
                  router.push("/modals/voice-input");
                } else if (mode === "paste") {
                  router.push("/modals/inbody-paste");
                } else {
                  router.push("/modals/log-food");
                }
              }}
              style={{
                flex: 1,
                backgroundColor: M3.colors.surface,
                borderRadius: M3.shape.medium,
                borderWidth: 1,
                borderColor: M3.colors.outline,
                paddingVertical: 12,
                alignItems: "center",
                gap: 6,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 2,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: M3.colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather
                  name={
                    mode === "type"
                      ? "edit-3"
                      : mode === "voice"
                      ? "mic"
                      : mode === "paste"
                      ? "clipboard"
                      : "camera"
                  }
                  size={15}
                  color={M3.colors.primary}
                />
              </View>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View>
              <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>Quick log</Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>Saved foods and reusable meals</Text>
            </View>
            <TouchableOpacity onPress={handleSaveMealTemplates} disabled={foodLogs.length === 0 || selectedDate > todayStr} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: M3.colors.surfaceVariant, opacity: foodLogs.length === 0 || selectedDate > todayStr ? 0.45 : 1 }}>
              <Text style={{ color: M3.colors.primary, fontSize: 11, fontFamily: "DMSans_700Bold" }}>Save day</Text>
            </TouchableOpacity>
          </View>
          {favoriteFoods.length > 0 ? favoriteFoods.slice(0, 4).map((favorite) => (
            <View key={favorite.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: M3.colors.outlineVariant }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>{favorite.name}</Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>{favorite.calories.toFixed(0)} kcal · {favorite.quantity_g ?? "—"} g · {favorite.meal}</Text>
              </View>
              <TouchableOpacity disabled={selectedDate > todayStr} onPress={() => void handleLogFavorite(favorite.id, favorite.name)} style={{ padding: 7, opacity: selectedDate > todayStr ? 0.4 : 1 }}>
                <Feather name="plus-circle" size={18} color={M3.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveFavorite(favorite.id, favorite.name)} style={{ padding: 7 }}>
                <Feather name="x-circle" size={16} color={M3.colors.onSurfaceMuted} />
              </TouchableOpacity>
            </View>
          )) : (
            <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular", paddingVertical: 6 }}>Tap the star beside a logged food to save it here.</Text>
          )}
          {repeatableMeals.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.5, marginBottom: 4 }}>REPEATABLE MEALS</Text>
              {repeatableMeals.slice(0, 4).map((template) => (
                <View key={template.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: M3.colors.onSurface, fontSize: 12, fontFamily: "DMSans_500Medium" }}>{template.name}</Text>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular" }}>{template.itemCount} items · {template.meal}</Text>
                  </View>
                  <TouchableOpacity disabled={selectedDate > todayStr} onPress={() => void handleRepeatMeal(template.id, template.name)} style={{ padding: 7, opacity: selectedDate > todayStr ? 0.4 : 1 }}>
                    <Feather name="repeat" size={17} color={M3.colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Meal Accordion ── */}
        {mealGroups.map((group) => (
          <Card key={group.meal}>
            <TouchableOpacity
              onPress={() => toggleMeal(group.meal)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name={MEAL_ICONS[group.meal]} size={16} color={M3.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold", textTransform: "capitalize" }}>
                    {group.meal}
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    {group.items.length} items · {group.totalProtein.toFixed(0)}g protein · {group.totalCalories.toFixed(0)} kcal
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/modals/log-food?meal=${group.meal}`)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: M3.colors.surfaceVariant,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="plus" size={14} color={M3.colors.primary} />
                </TouchableOpacity>
                <Feather
                  name={expandedMeals.has(group.meal) ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={M3.colors.onSurfaceMuted}
                />
              </View>
            </TouchableOpacity>

            {expandedMeals.has(group.meal) && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {group.items.length === 0 ? (
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 8 }}>
                    Nothing logged yet
                  </Text>
                ) : (
                  group.items.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: M3.colors.surfaceVariant,
                        borderRadius: 8,
                        padding: 10,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                          {item.name}
                        </Text>
                        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                          {item.calories.toFixed(0)} kcal · P:{item.protein_g.toFixed(0)}g · C:{item.carbs_g.toFixed(0)}g · F:{item.fat_g.toFixed(0)}g
                        </Text>
                        {item.provenance_type === "ai_estimated" && (
                          <Text style={{ color: item.estimate_reviewed === 1 ? M3.colors.success : M3.colors.warning, fontSize: 10, fontFamily: "DMSans_500Medium", marginTop: 3 }}>
                            AI estimate{item.estimate_confidence != null ? " · " + Math.round(item.estimate_confidence * 100) + "% confidence" : " · confidence unavailable"}{item.estimate_reviewed === 1 ? " · reviewed" : " · review needed"}
                          </Text>
                        )}
                      </View>
                      {item.provenance_type === "ai_estimated" && item.estimate_reviewed !== 1 && (
                        <TouchableOpacity onPress={() => handleReviewEstimate(item)} style={{ padding: 4 }}>
                          <Feather name="check-circle" size={15} color={M3.colors.warning} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => void handleAddFavorite(item)} style={{ padding: 4 }}>
                        <Feather name="star" size={14} color={M3.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteFood(item)} style={{ padding: 4 }}>
                        <Feather name="trash-2" size={14} color={M3.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>
        ))}

        {/* ── Weekly Trend ── */}
        {last7Days.length > 0 && (
          <Card>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
              7-DAY PROTEIN TREND
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 60 }}>
              {last7Days.map((day, i) => {
                const pct = Math.min(1, day.total_protein_g / activeTargets.protein_g);
                const hit = day.protein_target_met === 1;
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                    <View
                      style={{
                        width: "100%",
                        height: Math.max(4, pct * 48),
                        backgroundColor: hit ? M3.colors.success : M3.colors.error,
                        borderRadius: 3,
                      }}
                    />
                    <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                      {fromLocalDateKey(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {foodLogs.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <Feather name="pie-chart" size={48} color={M3.colors.onSurfaceMuted} />
            <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
              Nothing logged yet
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" }}>
              Tap &apos;Log Food&apos; above to start tracking your nutrition
            </Text>
          </View>
        )}
      </ScrollView>
      <QuickAddSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} />
    </SafeAreaView>
  );
}
