import { useEffect, useState, useCallback } from "react";
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
import { router } from "expo-router";
import { useTodayStore } from "../../lib/stores/today.store";
import {
  getDailyNutrition,
  getFoodLogsForDate,
  deleteFoodLog,
  getLast7DaysNutrition,
} from "../../lib/db/queries/nutrition";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { Card } from "../../components/ui/Card";
import { MacroBar } from "../../components/ui/MacroBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { DateNavigator } from "../../components/ui/DateNavigator";
import type { FoodLog, DailyNutrition } from "../../lib/db/schema";
import { M3 } from "../../design-system/tokens";

type MealType = "breakfast" | "lunch" | "snack" | "dinner";
const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
const MEAL_ICONS: Record<MealType, React.ComponentProps<typeof Feather>["name"]> = {
  breakfast: "sunrise",
  lunch: "sun",
  snack: "coffee",
  dinner: "moon",
};

interface MealGroup {
  meal: MealType;
  items: FoodLog[];
  totalCalories: number;
  totalProtein: number;
}

function groupByMeal(logs: FoodLog[]): MealGroup[] {
  return MEALS.map((meal) => {
    const items = logs.filter((l) => l.meal === meal);
    return {
      meal,
      items,
      totalCalories: items.reduce((a, b) => a + b.calories, 0),
      totalProtein: items.reduce((a, b) => a + b.protein_g, 0),
    };
  });
}

export default function NutritionScreen() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const { nutrition, foodLogs, setNutrition, setFoodLogs } = useTodayStore();

  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [last7Days, setLast7Days] = useState<DailyNutrition[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [nutritionData, logsData, weekData] = await Promise.all([
        getDailyNutrition(selectedDate),
        getFoodLogsForDate(selectedDate),
        getLast7DaysNutrition(),
      ]);
      setNutrition(nutritionData);
      setFoodLogs(logsData);
      setLast7Days(weekData);
    } catch (err) {
      console.error("Nutrition load error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const mealGroups = groupByMeal(foodLogs);

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 28, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
            NUTRITION
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/modals/log-food")}
            style={{
              backgroundColor: M3.colors.primary,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Feather name="plus" size={16} color={M3.colors.background} />
            <Text style={{ color: M3.colors.background, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              Log Food
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Date Navigator ── */}
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} showFullDate={false} />

        {/* ── Marathon Day Notice ── */}
        {new Date(selectedDate).getDay() === 0 && (
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
              of {USER_PROFILE.targets.calories} kcal
            </Text>
          </View>
          <MacroBar label="Protein" current={protein} target={USER_PROFILE.targets.protein_g} color={M3.colors.secondary} />
          <MacroBar label="Carbs" current={carbs} target={USER_PROFILE.targets.carbs_g} color={M3.colors.success} />
          <MacroBar label="Fat" current={fat} target={USER_PROFILE.targets.fat_g} color="#F59E0B" />
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
                borderRadius: 8,
                borderWidth: 1,
                borderColor: M3.colors.surfaceContainer,
                padding: 10,
                alignItems: "center",
                gap: 4,
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
                size={16}
                color={M3.colors.onSurfaceVariant}
              />
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteFood(item)}>
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
                const pct = Math.min(1, day.total_protein_g / USER_PROFILE.targets.protein_g);
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
                      {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
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
              Tap 'Log Food' above to start tracking your nutrition
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
