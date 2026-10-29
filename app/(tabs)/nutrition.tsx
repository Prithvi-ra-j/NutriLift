import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  deleteFoodLog,
  restoreFoodLog,
  useNutritionDay,
} from "../../lib/data";
import { DEFAULT_TARGETS } from "../../lib/constants/defaults";
import { Card } from "../../components/ui/Card";
import { MacroBar } from "../../components/ui/MacroBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { DateNavigator } from "../../components/ui/DateNavigator";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { FoodLog } from "../../lib/data/types";
import { M3 } from "../../design-system/tokens";
import { useToday } from "../../lib/time/useToday";
import { logger } from "../../lib/logger";
import { addDays, dayOfWeek, parseLocalDate } from "../../lib/time/localDate";
import { isTrackingPausedOnDate } from "../../lib/pauseMode";
import { confirmDestructive } from "../../components/ui/confirmDestructive";
import { useToast } from "../../components/ui/Toast";

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
  const { show } = useToast();
  const today = useToday();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate = pickedDate ?? today;
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
  const {
    data: day,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useNutritionDay(selectedDate, today);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  useEffect(() => {
    if (error) {
      logger.error("Nutrition load failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

  const nutrition = day?.nutrition ?? null;
  const foodLogs = day?.foodLogs ?? [];
  const last7Days = day?.last7Days ?? [];
  const trackingPause = {
    from: day?.trackingPause.from ?? null,
    until: day?.trackingPause.until ?? null,
  };
  const targets = day?.targets ?? DEFAULT_TARGETS;
  const proteinTargetsByDate = day?.proteinTargetsByDate ?? {};
  const loadError = isError
    ? "Could not load nutrition data. Please retry."
    : null;

  const handleDeleteFood = async (log: FoodLog) => {
    if (!(await confirmDestructive("Delete Food", `Remove "${log.name}"?`))) return;
    try {
      await deleteFoodLog(log.id, log.date);
      await refetch();
      show({
        message: "Food entry deleted.",
        kind: "success",
        durationMs: 5_000,
        action: {
          label: "Undo",
          onPress: () => {
            void restoreFoodLog(log.id, log.date)
              .then(() => refetch())
              .catch((error: unknown) => {
                logger.error("Food log undo failed", {
                  error: error instanceof Error ? error.message : String(error),
                });
                show({ message: "Could not restore this food entry.", kind: "error" });
              });
          },
        },
      });
    } catch (error) {
      logger.error("Food log deletion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({ message: "Could not delete this food entry.", kind: "error" });
    }
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
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => { void refetch(); }} tintColor={M3.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <ScreenHeader
          title="NUTRITION"
          subtitle={parseLocalDate(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          actionIcon="plus"
          actionLabel="Log Food"
          onAction={() => router.push({ pathname: "/modals/log-food", params: { date: selectedDate } })}
        />

        {/* ── Date Navigator ── */}
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={(date) => setPickedDate(date === today ? null : date)}
          showFullDate={false}
        />
        {loadError && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              void refetch();
            }}
            style={{ padding: 14, borderRadius: 10, backgroundColor: M3.colors.errorContainer }}
          >
            <Text style={{ color: M3.colors.onErrorContainer, fontFamily: "DMSans_500Medium" }}>
              {loadError} Tap to retry.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Marathon Day Notice ── */}
        {dayOfWeek(selectedDate) === 0 && (
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
              of {targets.calories} kcal
            </Text>
          </View>
          <MacroBar label="Protein" current={protein} target={targets.protein_g} color={M3.colors.secondary} />
          <MacroBar label="Carbs" current={carbs} target={targets.carbs_g} color={M3.colors.success} />
          <MacroBar label="Fat" current={fat} target={targets.fat_g} color={M3.macroColors.fat} />
        </Card>

        {/* ── Log Mode Buttons ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["type", "voice", "paste", "scan"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                if (mode === "scan") {
                  router.push({ pathname: "/modals/barcode-scanner", params: { date: selectedDate } });
                } else if (mode === "voice") {
                  router.push({ pathname: "/modals/voice-input", params: { date: selectedDate } });
                } else if (mode === "paste") {
                  router.push({ pathname: "/modals/inbody-paste", params: { date: selectedDate } });
                } else {
                  router.push({ pathname: "/modals/log-food", params: { date: selectedDate } });
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
                  onPress={() => router.push({
                    pathname: "/modals/log-food",
                    params: { meal: group.meal, date: selectedDate },
                  })}
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
        <Card>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
              7-DAY PROTEIN LOGGING
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 60 }}>
              {Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)).map((date) => {
                const day = last7Days.find((entry) => entry.date === date);
                const skipped = isTrackingPausedOnDate(date, trackingPause.from, trackingPause.until);
                const target = proteinTargetsByDate[date] ?? DEFAULT_TARGETS.protein_g;
                const pct = day ? Math.min(1, day.total_protein_g / target) : 0;
                const hit = day?.protein_target_met === 1;
                return (
                  <View key={date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                    {skipped || !day ? (
                      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, height: 48 }}>
                        —
                      </Text>
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: Math.max(4, pct * 48),
                          backgroundColor: hit ? M3.colors.success : M3.colors.onSurfaceMuted,
                          borderRadius: 3,
                        }}
                      />
                    )}
                    <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                      {parseLocalDate(date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                    </Text>
                  </View>
                );
              })}
            </View>
        </Card>

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
