import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTodayStore } from "../../lib/stores/today.store";
import { useUIStore } from "../../lib/stores/ui.store";
import {
  getDailyNutrition,
  getFoodLogsForDate,
} from "../../lib/db/queries/nutrition";
import { getSessionsForDate } from "../../lib/db/queries/workout";
import { getRecoveryLog } from "../../lib/db/queries/recovery";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { Card } from "../../components/ui/Card";
import { MacroRing } from "../../components/ui/MacroRing";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import { M3 } from "../../design-system/tokens";
import { getLocalDateKey } from "../../lib/utils/date";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayDayType(): string {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) return "Cardio";
  const dayTypeMap: Record<number, string> = {
    1: "Push A",
    2: "Pull A",
    3: "Legs A",
    4: "Push B",
    5: "Pull B",
    6: "Legs B",
  };
  return dayTypeMap[dayOfWeek] || "";
}

export default function DashboardScreen() {
  const today = getLocalDateKey();
  const { nutrition, session, setNutrition, setSession, setFoodLogs } = useTodayStore();
  const { coachInsight } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
  const [todayDayType, setTodayDayType] = useState(getTodayDayType());

  const loadData = useCallback(async () => {
    try {
      const [nutritionData, foodLogsData, sessionsData, recoveryData] =
        await Promise.all([
          getDailyNutrition(today),
          getFoodLogsForDate(today),
          getSessionsForDate(today),
          getRecoveryLog(today),
        ]);

      setNutrition(nutritionData);
      setFoodLogs(foodLogsData);

      if (sessionsData[0]) {
        setSession(sessionsData[0]);
        setTodayDayType(new Date().getDay() === 0 ? "Cardio" : sessionsData[0].day_type);
      } else {
        setSession(null);
        setTodayDayType(getTodayDayType());
      }

      if (recoveryData) {
        const score =
          ((recoveryData.sleep_quality ?? 3) +
            (recoveryData.energy_level ?? 3) +
            (6 - (recoveryData.muscle_soreness ?? 3))) /
          3;
        setRecoveryScore(Math.round((score / 5) * 100));
      } else {
        setRecoveryScore(null);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [today, setNutrition, setFoodLogs, setSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const calories = nutrition?.total_calories ?? 0;
  const protein = nutrition?.total_protein_g ?? 0;
  const carbs = nutrition?.total_carbs_g ?? 0;
  const fat = nutrition?.total_fat_g ?? 0;
  const proteinTarget = USER_PROFILE.targets.protein_g;
  const caloriesTarget = USER_PROFILE.targets.calories;
  const proteinRemaining = Math.max(0, proteinTarget - protein);
  const mealsLeft = 3;
  const proteinPerMeal = proteinRemaining / mealsLeft;
  const caloriePct = Math.min(100, (calories / caloriesTarget) * 100);

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
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 120,
          gap: 18,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={M3.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text
              style={{
                color: M3.colors.onSurface,
                fontSize: 30,
                lineHeight: 34,
                fontFamily: "BebasNeue_400Regular",
                letterSpacing: 0.4,
                marginTop: 2,
              }}
            >
              {getGreeting()}, {USER_PROFILE.name}
            </Text>
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: M3.colors.primaryContainer,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: M3.colors.primary + "55",
            }}
          >
            <Text style={{ color: M3.colors.primary, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
              {USER_PROFILE.name?.charAt(0).toUpperCase() ?? "N"}
            </Text>
          </View>
        </View>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <MacroRing
              protein={protein}
              carbs={carbs}
              fat={fat}
              proteinTarget={proteinTarget}
              carbsTarget={USER_PROFILE.targets.carbs_g}
              fatTarget={USER_PROFILE.targets.fat_g}
              calories={calories}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, letterSpacing: 0.8, fontFamily: "DMSans_700Bold" }}>
                TODAY'S NUTRITION
              </Text>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, marginTop: 4, fontFamily: "DMSans_700Bold" }}>
                {calories.toFixed(0)} kcal
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, marginTop: 3, fontFamily: "DMSans_400Regular" }}>
                {Math.round(caloriePct)}% of daily calorie target
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <View>
                  <Text style={{ color: M3.colors.secondary, fontSize: 15, fontFamily: "DMSans_700Bold" }}>{protein.toFixed(0)}g</Text>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>PROTEIN</Text>
                </View>
                <View>
                  <Text style={{ color: M3.colors.success, fontSize: 15, fontFamily: "DMSans_700Bold" }}>{carbs.toFixed(0)}g</Text>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>CARBS</Text>
                </View>
                <View>
                  <Text style={{ color: M3.macroColors.fat, fontSize: 15, fontFamily: "DMSans_700Bold" }}>{fat.toFixed(0)}g</Text>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>FAT</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {proteinRemaining > 0 ? (
          <Card elevated>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: M3.colors.secondary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="target" size={16} color={M3.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, letterSpacing: 0.8, fontFamily: "DMSans_700Bold" }}>
                  YOUR BIGGEST OPPORTUNITY
                </Text>
                <Text style={{ color: M3.colors.onSurface, fontSize: 15, lineHeight: 21, marginTop: 4, fontFamily: "DMSans_500Medium" }}>
                  {proteinRemaining.toFixed(0)}g of protein left today.
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 2, fontFamily: "DMSans_400Regular" }}>
                  Aim for about {proteinPerMeal.toFixed(0)}g across your remaining meals.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/modals/log-food")}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 12,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: M3.colors.primaryContainer,
                  }}
                >
                  <Text style={{ color: M3.colors.primary, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                    Log a meal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="check-circle" size={18} color={M3.colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                  Protein target reached
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, marginTop: 2, fontFamily: "DMSans_400Regular" }}>
                  Nice work. Keep the rest of today balanced.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {coachInsight ? (
          <Card>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: M3.colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="cpu" size={14} color={M3.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.primary, fontSize: 10, letterSpacing: 0.8, fontFamily: "DMSans_700Bold" }}>
                  NUTRILIFT COACH
                </Text>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, lineHeight: 19, marginTop: 4, fontFamily: "DMSans_400Regular" }}>
                  {coachInsight}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, letterSpacing: 0.8, fontFamily: "DMSans_700Bold" }}>
                NEXT UP
              </Text>
              <Text style={{ color: M3.colors.onSurface, fontSize: 18, marginTop: 4, fontFamily: "DMSans_700Bold" }}>
                {session ? `${todayDayType} · Completed` : todayDayType || "Recovery"}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 3, fontFamily: "DMSans_400Regular" }}>
                {session
                  ? `${session.total_volume_kg?.toFixed(0) ?? 0}kg total volume${session.duration_min ? ` · ${session.duration_min}min` : ""}`
                  : todayDayType === "Cardio"
                    ? "Recovery day · cardio & mobility"
                    : "Ready when you are."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/workout")}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: session ? M3.colors.surfaceVariant : M3.colors.primary,
              }}
            >
              <Feather
                name={session ? "check" : todayDayType === "Cardio" ? "activity" : "arrow-right"}
                size={20}
                color={session ? M3.colors.success : M3.colors.background}
              />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push("/modals/log-food")}
            style={{
              flex: 1,
              backgroundColor: M3.colors.primaryContainer,
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <Feather name="plus-circle" size={17} color={M3.colors.primary} />
            <Text style={{ color: M3.colors.primary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              Log food
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/workout")}
            style={{
              flex: 1,
              backgroundColor: M3.colors.tertiaryContainer,
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <Feather name="activity" size={17} color={M3.colors.tertiary} />
            <Text style={{ color: M3.colors.tertiary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              Log workout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
