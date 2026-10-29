import { useCallback, useEffect } from "react";
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
import { useHomeSummary } from "../../lib/data";
import { DEFAULT_TARGETS } from "../../lib/constants/defaults";
import { Card } from "../../components/ui/Card";
import { MacroBar } from "../../components/ui/MacroBar";
import { MacroRing } from "../../components/ui/MacroRing";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import { M3 } from "../../design-system/tokens";
import { useToday } from "../../lib/time/useToday";
import { addDays, dayOfWeek, parseLocalDate } from "../../lib/time/localDate";
import { logger } from "../../lib/logger";
import { isTrackingPausedOnDate } from "../../lib/pauseMode";
import { mealForHour } from "../../lib/domain/nutrition";

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
  logged: boolean;
  skipped: boolean;
}

export default function DashboardScreen() {
  const today = useToday();
  const suggestedMeal = mealForHour(new Date().getHours());
  const {
    data: summary,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useHomeSummary(today);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  useEffect(() => {
    if (error) {
      logger.error("Dashboard load failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [error]);

  const getTodayDayType = (date: string): string => {
    const weekday = dayOfWeek(date);
    
    // Sunday = Cardio (Marathon day)
    if (weekday === 0) return "Cardio";
    
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
    
    return dayTypeMap[weekday] || "";
  };

  const nutrition = summary?.nutrition ?? null;
  const session = summary?.sessions[0] ?? null;
  const profile = summary?.profile ?? null;
  const targets = summary?.targets ?? DEFAULT_TARGETS;
  const trackingPaused = summary?.trackingPause.paused ?? false;
  const todayDayType = session
    ? dayOfWeek(today) === 0 ? "Cardio" : session.day_type
    : getTodayDayType(today);
  const adherenceDots: AdherenceDot[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const skipped = isTrackingPausedOnDate(
      date,
      summary?.trackingPause.from ?? null,
      summary?.trackingPause.until ?? null,
    );
    const dayData = summary?.last7Days.find((entry) => entry.date === date);
    return {
      date,
      logged: !skipped && (dayData?.food_count ?? 0) > 0,
      skipped,
    };
  });
  const recoveryScore = summary?.recovery
    ? Math.round(
      (((summary.recovery.sleep_quality ?? 3) +
        (summary.recovery.energy_level ?? 3) +
        (6 - (summary.recovery.muscle_soreness ?? 3))) /
        3 / 5) *
        100,
    )
    : null;
  const loadError = isError
    ? "Could not load today's dashboard. Please retry."
    : null;

  const calories = nutrition?.total_calories ?? 0;
  const protein = nutrition?.total_protein_g ?? 0;
  const carbs = nutrition?.total_carbs_g ?? 0;
  const fat = nutrition?.total_fat_g ?? 0;

  const caloriePct = Math.min(100, (calories / targets.calories) * 100);

  // Protein pace
  const mealsLogged = 2; // simplified — would count distinct meals
  const proteinRemaining = Math.max(0, targets.protein_g - protein);
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
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => { void refetch(); }}
            tintColor={M3.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              {formatDate(parseLocalDate(today))}
            </Text>
            <Text style={{ color: M3.colors.onSurface, fontSize: 26, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
              {getGreeting()}, {profile?.display_name?.trim() || "You"}
            </Text>
          </View>
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
              {profile?.display_name?.trim().charAt(0).toUpperCase() ?? "Y"}
            </Text>
          </View>
        </View>

        {/* ── Calorie Ring + Macro Summary ── */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {/* Macro ring */}
            <MacroRing
              protein={protein}
              carbs={carbs}
              fat={fat}
              proteinTarget={targets.protein_g}
              carbsTarget={targets.carbs_g}
              fatTarget={targets.fat_g}
              calories={calories}
              caloriesTarget={targets.calories}
            />

            {/* Macro bars */}
            <View style={{ flex: 1 }}>
              <MacroBar
                label="Protein"
                current={protein}
                target={targets.protein_g}
                color={M3.colors.secondary}
              />
              <MacroBar
                label="Carbs"
                current={carbs}
                target={targets.carbs_g}
                color={M3.colors.success}
              />
              <MacroBar
                label="Fat"
                current={fat}
                target={targets.fat_g}
                color={M3.macroColors.fat}
              />
            </View>
          </View>
        </Card>

        {/* ── Stats Row ── */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Protein", value: `${protein.toFixed(0)}g`, sub: `/ ${targets.protein_g}g`, color: M3.colors.secondary, icon: "target" as const },
            { label: "Calories", value: calories.toFixed(0), sub: `/ ${targets.calories}`, color: M3.colors.primary, icon: "zap" as const },
            { label: "Volume", value: session?.total_volume_kg ? `${(session.total_volume_kg / 1000).toFixed(1)}t` : "—", sub: "today", color: M3.colors.tertiary, icon: "trending-up" as const },
            { label: "Recovery", value: recoveryScore ? `${recoveryScore}` : "—", sub: "/ 100", color: M3.colors.success, icon: "heart" as const },
          ].map((stat) => (
            <Card key={stat.label} style={{ flex: 1, padding: 12, alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: stat.color + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={stat.icon} size={13} color={stat.color} />
              </View>
              <Text style={{ color: stat.color, fontSize: 17, fontFamily: "DMSans_700Bold" }}>
                {stat.value}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular", marginTop: -4 }}>
                {stat.sub}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_500Medium", letterSpacing: 0.3 }}>
                {stat.label.toUpperCase()}
              </Text>
            </Card>
          ))}
        </View>

        {/* ── Protein Pace ── */}
        {!trackingPaused && proteinRemaining > 0 && (
          <Card elevated>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="target" size={16} color={M3.colors.secondary} />
              <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>
                Need{" "}
                <Text style={{ color: M3.colors.secondary, fontFamily: "DMSans_700Bold" }}>
                  {proteinRemaining.toFixed(0)}g
                </Text>{" "}
                more protein — {proteinPerMeal.toFixed(0)}g per remaining meal
              </Text>
            </View>
          </Card>
        )}

        {/* ── 7-Day Logging Status ── */}
        <View style={{ paddingHorizontal: 4 }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
            {trackingPaused
              ? "TRACKING PAUSED — DAYS ARE SKIPPED"
              : `NUTRITION LOGGED ${adherenceDots.filter((dot) => dot.logged).length} OF LAST 7 DAYS${adherenceDots.some((dot) => dot.skipped) ? ` · ${adherenceDots.filter((dot) => dot.skipped).length} SKIPPED` : ""}`}
          </Text>
          {trackingPaused ? (
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
              No adherence score is shown while tracking is paused.
            </Text>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {adherenceDots.map((dot) => {
                const dayLabel = parseLocalDate(dot.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
                return (
                  <View key={dot.date} style={{ alignItems: "center", gap: 4 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: dot.logged ? M3.colors.primaryContainer : M3.colors.surfaceContainer,
                        borderWidth: 2,
                        borderColor: dot.logged ? M3.colors.primary : M3.colors.outline,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {dot.logged ? (
                        <Feather name="check" size={12} color={M3.colors.onPrimaryContainer} />
                      ) : dot.skipped ? (
                        <Feather name="minus" size={12} color={M3.colors.onSurfaceVariant} />
                      ) : null}
                    </View>
                    <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                      {dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

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
            onPress={() => router.push({
              pathname: "/modals/log-food",
              params: { meal: suggestedMeal, date: today },
            })}
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
              Log {suggestedMeal}
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
