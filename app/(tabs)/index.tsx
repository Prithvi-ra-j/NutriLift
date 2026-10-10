import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTodayStore } from "../../lib/stores/today.store";
import { useUIStore } from "../../lib/stores/ui.store";
import { getDailyNutrition, getFoodLogsForDate, getLast7DaysNutrition } from "../../lib/db/queries/nutrition";
import { getSessionsForDate } from "../../lib/db/queries/workout";
import { getRecoveryLog } from "../../lib/db/queries/recovery";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { DAY_TYPES, type DayType } from "../../lib/constants/exercises";
import { Card } from "../../components/ui/Card";
import { MacroBar } from "../../components/ui/MacroBar";
import { MacroRing } from "../../components/ui/MacroRing";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { DailyNutrition, WorkoutSession } from "../../lib/db/schema";
import { M3 } from "../../design-system/tokens";
import { toLocalDateString } from "../../lib/utils/local-date";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getDayTypeBadgeColor(dayType: string): string {
  if (dayType.startsWith("Push")) return "#FF6B6B";
  if (dayType.startsWith("Pull")) return "#4ECDC4";
  if (dayType.startsWith("Legs")) return "#45B7D1";
  if (dayType === "Marathon" || dayType === "Cardio") return M3.colors.error;
  return M3.colors.onSurfaceVariant;
}

interface AdherenceDot {
  date: string;
  status: "green" | "amber" | "red" | "empty";
}

export default function DashboardScreen() {
  const today = toLocalDateString();
  const { nutrition, session, foodLogs, setNutrition, setSession, setFoodLogs } = useTodayStore();
  const { coachInsight } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adherenceDots, setAdherenceDots] = useState<AdherenceDot[]>([]);
  const [hasRecoveryCheckin, setHasRecoveryCheckin] = useState(false);

  // Determine today's day type based on day of week
  const getTodayDayType = (): string => {
    const dayOfWeek = new Date().getDay();
    
    // Sunday = Cardio (Marathon day)
    if (dayOfWeek === 0) return "Cardio";
    
    // Monday = Push A, Tuesday = Pull A, Wednesday = Legs A
    // Thursday = Push B, Friday = Pull B, Saturday = Legs B
    const dayTypeMap: Record<number, string> = {
      1: "Push A", // Monday
      2: "Pull A", // Tuesday
      3: "Legs A", // Wednesday
      4: "Push B", // Thursday
      5: "Pull B", // Friday
      6: "Legs B", // Saturday
    };
    
    return dayTypeMap[dayOfWeek] || "";
  };

  const [todayDayType, setTodayDayType] = useState<string>(getTodayDayType());

  const loadData = useCallback(async () => {
    try {
      const [nutritionData, foodLogsData, sessionsData, last7Days, recoveryData] =
        await Promise.all([
          getDailyNutrition(today),
          getFoodLogsForDate(today),
          getSessionsForDate(today),
          getLast7DaysNutrition(),
          getRecoveryLog(today),
        ]);

      setNutrition(nutritionData);
      setFoodLogs(foodLogsData);
      
      // Handle session and day type
      if (sessionsData[0]) {
        setSession(sessionsData[0]);
        // On Sunday, always show "Cardio" regardless of what workout was logged
        if (new Date().getDay() === 0) {
          setTodayDayType("Cardio");
        } else {
          setTodayDayType(sessionsData[0].day_type);
        }
      } else {
        setSession(null);
        setTodayDayType(getTodayDayType());
      }

      // Build 7-day adherence dots
      const dots: AdherenceDot[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toLocalDateString(d);
        const dayData = last7Days.find((n) => n.date === dateStr);

        let status: AdherenceDot["status"] = "empty";
        if (dayData) {
          if (dayData.protein_target_met === 1) status = "green";
          else if ((dayData.adherence_score ?? 0) >= 60) status = "amber";
          else status = "red";
        }
        dots.push({ date: dateStr, status });
      }
      setAdherenceDots(dots);

      // Recovery entries are subjective check-ins, not a sensor-derived recovery score.
      setHasRecoveryCheckin(Boolean(recoveryData));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [today]);

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

  const caloriePct = Math.min(100, (calories / USER_PROFILE.targets.calories) * 100);

  // Protein pace
  const mealsLogged = new Set((foodLogs ?? []).map((log) => log.meal)).size;
  const proteinRemaining = Math.max(0, USER_PROFILE.targets.protein_g - protein);
  const mealsLeft = Math.max(1, 4 - mealsLogged);
  const proteinPerMeal = proteinRemaining / mealsLeft;

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
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 112, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={M3.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              {formatDate(new Date())}
            </Text>
            <Text style={{ color: M3.colors.onSurface, fontSize: 24, fontFamily: "DMSans_700Bold", letterSpacing: -0.6 }}>
              {getGreeting()}, {USER_PROFILE.name}
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: M3.colors.primaryContainer,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: M3.colors.primary + "55",
            }}
          >
            <Text style={{ color: M3.colors.primary, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
              {USER_PROFILE.name?.charAt(0).toUpperCase() ?? "N"}
            </Text>
          </View>
        </View>

        {/* ── Calorie Ring + Macro Summary ── */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ gap: 3 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1 }}>
                TODAY'S INTAKE
              </Text>
              <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                {calories > USER_PROFILE.targets.calories ? `${(calories - USER_PROFILE.targets.calories).toFixed(0)} kcal over goal` : `${(USER_PROFILE.targets.calories - calories).toFixed(0)} kcal left` }
              </Text>
            </View>
            <View style={{ backgroundColor: M3.colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: M3.colors.onPrimaryContainer, fontSize: 11, fontFamily: "DMSans_700Bold" }}>
                {caloriePct.toFixed(0)}% of goal
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {/* Macro ring */}
            <MacroRing
              protein={protein}
              carbs={carbs}
              fat={fat}
              proteinTarget={USER_PROFILE.targets.protein_g}
              carbsTarget={USER_PROFILE.targets.carbs_g}
              fatTarget={USER_PROFILE.targets.fat_g}
              calories={calories}
              caloriesTarget={USER_PROFILE.targets.calories}
            />

            {/* Macro bars */}
            <View style={{ flex: 1 }}>
              <MacroBar
                label="Protein"
                current={protein}
                target={USER_PROFILE.targets.protein_g}
                color={M3.colors.secondary}
              />
              <MacroBar
                label="Carbs"
                current={carbs}
                target={USER_PROFILE.targets.carbs_g}
                color={M3.colors.success}
              />
              <MacroBar
                label="Fat"
                current={fat}
                target={USER_PROFILE.targets.fat_g}
                color={M3.macroColors.fat}
              />
            </View>
          </View>
        </Card>

        {/* ── At-a-glance metrics ── */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            {
              label: "PROTEIN LEFT",
              value: `${proteinRemaining.toFixed(0)}g`,
              detail: `of ${USER_PROFILE.targets.protein_g}g goal`,
              color: M3.macroColors.protein,
            },
            {
              label: "CALORIES",
              value: calories > USER_PROFILE.targets.calories ? `${(calories - USER_PROFILE.targets.calories).toFixed(0)}` : `${(USER_PROFILE.targets.calories - calories).toFixed(0)}`,
              detail: calories > USER_PROFILE.targets.calories ? "kcal over goal" : "kcal remaining",
              color: M3.macroColors.calories,
            },
            {
              label: "WORKOUT",
              value: session ? "Done" : "Planned",
              detail: todayDayType || "Rest day",
              color: M3.colors.tertiary,
            },
          ].map((stat) => (
            <Card key={stat.label} style={{ flex: 1, padding: 12, gap: 7 }} variant="filled">
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_700Bold", letterSpacing: 0.7 }} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text style={{ color: stat.color, fontSize: 20, fontFamily: "DMSans_700Bold", letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>
                {stat.value}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular" }} numberOfLines={1}>
                {stat.detail}
              </Text>
            </Card>
          ))}
        </View>

        {/* ── Protein pace ── */}
        {proteinRemaining > 0 && (
          <Card variant="outlined">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: M3.colors.secondaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="target" size={16} color={M3.colors.secondary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                  Protein pace
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 }}>
                  {proteinRemaining.toFixed(0)}g left today. Aim for about {proteinPerMeal.toFixed(0)}g across each of your {mealsLeft} remaining meal{mealsLeft === 1 ? "" : "s"}.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Recovery check-in ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: "/(tabs)/more", params: { section: "recovery" } })}
        >
          <Card variant="outlined">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: M3.colors.surfaceContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="moon" size={16} color={M3.colors.secondary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                  Recovery check-in
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  {hasRecoveryCheckin ? "Today's manual check-in is saved" : "Log sleep, energy, soreness and stress"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceVariant} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* ── 7-Day Adherence Strip ── */}
        <View style={{ paddingHorizontal: 4 }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
            7-DAY PROTEIN ADHERENCE
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {adherenceDots.map((dot, i) => {
              const dotColor =
                dot.status === "green"
                  ? M3.colors.success
                  : dot.status === "amber"
                  ? M3.colors.warning
                  : dot.status === "red"
                  ? M3.colors.error
                  : M3.colors.surfaceContainer;
              const dayLabel = new Date(dot.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
              return (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: dotColor + "22",
                      borderWidth: 2,
                      borderColor: dotColor,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {dot.status !== "empty" && (
                      <Feather
                        name={dot.status === "green" ? "check" : dot.status === "amber" ? "minus" : "x"}
                        size={12}
                        color={dotColor}
                      />
                    )}
                  </View>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Coach Insight ── */}
        {coachInsight && (
          <Card elevated>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: M3.colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Feather name="cpu" size={14} color={M3.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.primary, fontSize: 11, fontFamily: "DMSans_700Bold", marginBottom: 4, letterSpacing: 0.5 }}>
                  NUTRILIFT COACH
                </Text>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 19 }}>
                  {coachInsight}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Workout Status ── */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 3 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                TODAY'S WORKOUT
              </Text>
              {session ? (
                <>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    {todayDayType} — Completed
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    {session.total_volume_kg?.toFixed(0) ?? 0}kg total volume
                    {session.duration_min ? ` · ${session.duration_min}min` : ""}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    {todayDayType || "Not started"}
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    {todayDayType === "Cardio" ? "Recovery day - cardio & stretching" : "Tap to start your session"}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/workout")}
              style={{
                backgroundColor: session ? M3.colors.surfaceVariant : M3.colors.primary,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Feather
                name={session ? "check-circle" : todayDayType === "Cardio" ? "activity" : "zap"}
                size={18}
                color={session ? M3.colors.success : M3.colors.background}
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Quick Log FAB area ── */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push("/modals/log-food")}
            style={{
              flex: 1,
              backgroundColor: M3.colors.primaryContainer,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: M3.colors.primary,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Feather name="plus-circle" size={18} color={M3.colors.primary} />
            <Text style={{ color: M3.colors.primary, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
              Log Food
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/workout")}
            style={{
              flex: 1,
              backgroundColor: M3.colors.tertiaryContainer,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: M3.colors.tertiary,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Feather name="activity" size={18} color={M3.colors.tertiary} />
            <Text style={{ color: M3.colors.tertiary, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
              Log Workout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
