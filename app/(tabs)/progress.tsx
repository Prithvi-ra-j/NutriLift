import { useEffect, useState, useCallback, useRef } from "react";
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
import { getAllPRs } from "../../lib/data";
import { getWeightHistory, getAllInBodyRecords } from "../../lib/data";
import { getLast30DaysNutrition } from "../../lib/data";
import { getRecentRecoveryLogs } from "../../lib/data";
import { computeNutritionSummary } from "../../lib/analytics/nutrition-analytics";
import { computeBodySummary } from "../../lib/analytics/body-analytics";
import { canCommentOnBodyComp, getEligibleBodyCompTimeOfDay } from "../../lib/analytics/bodyCompSafety";
import { rollingBodyAverage } from "../../lib/analytics/body-averages";
import { getTargetsForDate } from "../../lib/data/profile";
import { DEFAULT_TARGETS } from "../../lib/constants/defaults";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import type { PersonalRecord, BodyStat, DailyNutrition, RecoveryLog } from "../../lib/data/types";
import { M3 } from "../../design-system/tokens";
import { addDays, parseLocalDate, startOfWeekMonday } from "../../lib/time/localDate";
import { useToday } from "../../lib/time/useToday";
import { logger } from "../../lib/logger";
import { beginRequest, invalidateRequests, isLatestRequest } from "../../lib/async/latestRequest";

type ProgressSection = "strength" | "body" | "nutrition" | "recovery";

export default function ProgressScreen() {
  const today = useToday();
  const [activeSection, setActiveSection] = useState<ProgressSection>("body");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate = pickedDate ?? today;
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [weightHistory, setWeightHistory] = useState<BodyStat[]>([]);
  const [inBodyRecords, setInBodyRecords] = useState<BodyStat[]>([]);
  const [nutritionHistory, setNutritionHistory] = useState<DailyNutrition[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [targets, setTargets] = useState<
    Pick<Awaited<ReturnType<typeof getTargetsForDate>>, "calories" | "protein_g" | "carbs_g" | "fat_g">
  >(DEFAULT_TARGETS);

  // Get week range for selected date
  const getWeekRange = (dateStr: string) => {
    const start = startOfWeekMonday(dateStr);
    const end = addDays(start, 6);
    return {
      start,
      end,
      monday: parseLocalDate(start),
      sunday: parseLocalDate(end),
    };
  };

  const weekRange = getWeekRange(selectedDate);
  const isCurrentWeek = weekRange.start === getWeekRange(today).start;

  const loadData = useCallback(async () => {
    const request = beginRequest(requestId);
    setLoadError(null);
    try {
      const [prsData, weightData, inBodyData, nutritionData, recoveryData, targetData] = await Promise.all([
        getAllPRs(),
        getWeightHistory(90), // Get 90 days to cover multiple weeks
        getAllInBodyRecords(),
        getLast30DaysNutrition(),
        getRecentRecoveryLogs(30), // Get 30 days to cover multiple weeks
        getTargetsForDate(selectedDate),
      ]);
      if (!isLatestRequest(requestId, request)) return;
      setPRs(prsData);
      setWeightHistory(weightData);
      setInBodyRecords(inBodyData);
      setNutritionHistory(nutritionData);
      setRecoveryLogs(recoveryData);
      setTargets(targetData);
    } catch (err) {
      logger.error("Progress load failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      if (isLatestRequest(requestId, request)) {
        setLoadError("Could not load progress data. Please retry.");
      }
    } finally {
      if (isLatestRequest(requestId, request)) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
    return () => {
      invalidateRequests(requestId);
    };
  }, [loadData]);

  // Filter data for selected week
  const weekWeightHistory = weightHistory.filter(
    (stat) => stat.date >= weekRange.start && stat.date <= weekRange.end
  );
  
  const weekNutritionHistory = nutritionHistory.filter(
    (day) => day.date >= weekRange.start && day.date <= weekRange.end
  );
  
  const weekRecoveryLogs = recoveryLogs.filter(
    (log) => log.date >= weekRange.start && log.date <= weekRange.end
  );
  
  const weekPRs = prs.filter(
    (pr) => pr.achieved_date >= weekRange.start && pr.achieved_date <= weekRange.end
  );

  const nutritionSummary = computeNutritionSummary(weekNutritionHistory);
  const latestInBody = inBodyRecords[inBodyRecords.length - 1] ?? null;
  const bodySummary = computeBodySummary(weekWeightHistory, latestInBody);
  const eligibleBodyCompTimeOfDay = getEligibleBodyCompTimeOfDay(inBodyRecords);
  const bodyCompEligible = canCommentOnBodyComp(inBodyRecords);
  const comparableInBodyRecords = eligibleBodyCompTimeOfDay
    ? inBodyRecords.filter(
      (record) => record.measurement_time_of_day === eligibleBodyCompTimeOfDay,
    )
    : [];
  const selectedWeightAverage = rollingBodyAverage(weightHistory, "weight_kg", selectedDate);
  const selectedBodyFatAverage = bodyCompEligible
    ? rollingBodyAverage(comparableInBodyRecords, "body_fat_pct", selectedDate)
    : null;

  const goToPreviousWeek = () => {
    setPickedDate(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    setPickedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setPickedDate(null);
  };

  const sections: { key: ProgressSection; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "body", label: "Body", icon: "user" },
    { key: "strength", label: "Strength", icon: "zap" },
    { key: "nutrition", label: "Nutrition", icon: "pie-chart" },
    { key: "recovery", label: "Recovery", icon: "moon" },
  ];

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
        {loadError && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setIsLoading(true);
              loadData();
            }}
            style={{ padding: 14, borderRadius: 10, backgroundColor: M3.colors.errorContainer }}
          >
            <Text style={{ color: M3.colors.onErrorContainer, fontFamily: "DMSans_500Medium" }}>
              {loadError} Tap to retry.
            </Text>
          </TouchableOpacity>
        )}
        <ScreenHeader
          title="PROGRESS"
          subtitle={isCurrentWeek ? "This week" : `Week of ${weekRange.monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          actionIcon={!isCurrentWeek ? "calendar" : undefined}
          actionLabel={!isCurrentWeek ? "Today" : undefined}
          onAction={!isCurrentWeek ? goToToday : undefined}
        />

        {/* ── Week Navigation ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <TouchableOpacity
              onPress={goToPreviousWeek}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: M3.colors.surface,
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: M3.colors.surfaceContainer,
              }}
            >
              <Feather name="chevrons-left" size={14} color={M3.colors.onSurfaceVariant} />
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                Prev Week
              </Text>
            </TouchableOpacity>
            
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
              {isCurrentWeek ? "This Week" : `Week of ${weekRange.monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </Text>
            
            <TouchableOpacity
              onPress={goToNextWeek}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: M3.colors.surface,
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: M3.colors.surfaceContainer,
              }}
            >
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                Next Week
              </Text>
              <Feather name="chevrons-right" size={14} color={M3.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

        {/* ── Section Tabs ── */}
        <SegmentedControl segments={sections} active={activeSection} onChange={setActiveSection} />

        {/* ── Body Composition ── */}
        {activeSection === "body" && (
          <>
            {/* Current stats */}
            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                BODY COMPOSITION
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { label: "7-day Weight Avg", value: selectedWeightAverage !== null ? `${selectedWeightAverage.toFixed(1)}kg` : "—", color: M3.colors.onSurface },
                  { label: "7-day Body Fat Avg", value: selectedBodyFatAverage !== null ? `${selectedBodyFatAverage.toFixed(1)}%` : "—", color: M3.colors.error },
                  { label: "Muscle", value: latestInBody?.skeletal_muscle_mass_kg ? `${latestInBody.skeletal_muscle_mass_kg.toFixed(1)}kg` : "—", color: M3.colors.success },
                  { label: "InBody", value: latestInBody?.inbody_score ? `${latestInBody.inbody_score}` : "—", color: M3.colors.primary },
                ].map((stat) => (
                  <View key={stat.label} style={{ alignItems: "center" }}>
                    <Text style={{ color: stat.color, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                      {stat.value}
                    </Text>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Body composition */}
            <Card elevated>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Feather name="target" size={16} color={M3.colors.primary} />
                <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                  Body Composition
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    7-day Body Fat Average
                  </Text>
                  <Text style={{ color: selectedBodyFatAverage !== null ? M3.colors.error : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    {selectedBodyFatAverage !== null ? `${selectedBodyFatAverage.toFixed(1)}%` : "—"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    Trend
                  </Text>
                  <Text style={{
                    color: bodySummary.trend === "losing" ? M3.colors.success : bodySummary.trend === "gaining" ? M3.colors.error : M3.colors.warning,
                    fontSize: 13,
                    fontFamily: "DMSans_700Bold",
                    textTransform: "capitalize",
                  }}>
                    {bodyCompEligible ? bodySummary.trend : "Not enough consistent measurements"}
                  </Text>
                </View>
                <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Body-fat readings can shift by a few percentage points with hydration. Compare rolling averages, not single readings.
                </Text>
              </View>
            </Card>

            {/* Weight history mini chart */}
            {weekWeightHistory.length > 0 && (
              <Card>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  {isCurrentWeek ? "THIS WEEK" : "WEEK"} WEIGHT TREND
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 60 }}>
                  {weekWeightHistory.map((stat, i) => {
                    const weights = weekWeightHistory
                      .map((s) => rollingBodyAverage(weightHistory, "weight_kg", s.date))
                      .filter((value): value is number => value !== null);
                    const min = Math.min(...weights);
                    const max = Math.max(...weights);
                    const range = max - min || 1;
                    const average = rollingBodyAverage(weightHistory, "weight_kg", stat.date) ?? min;
                    const pct = (average - min) / range;
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: Math.max(4, pct * 50 + 10),
                          backgroundColor: "#00D4AA44",
                          borderRadius: 2,
                          borderTopWidth: 2,
                          borderTopColor: M3.colors.primary,
                        }}
                      />
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                    Mon
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                    Sun
                  </Text>
                </View>
                {weekWeightHistory.length > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                      Start: {rollingBodyAverage(weightHistory, "weight_kg", weekWeightHistory[0]?.date ?? selectedDate)?.toFixed(1) ?? "—"}kg
                    </Text>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                      End: {rollingBodyAverage(weightHistory, "weight_kg", weekWeightHistory[weekWeightHistory.length - 1]?.date ?? selectedDate)?.toFixed(1) ?? "—"}kg
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* InBody history */}
            {inBodyRecords.length > 1 && (
              <Card>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  INBODY HISTORY
                </Text>
                {inBodyRecords.slice(-5).reverse().map((record) => (
                  <View
                    key={record.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: M3.colors.surfaceVariant,
                    }}
                  >
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                      {record.date}
                    </Text>
                    <Text style={{ color: M3.colors.onSurface, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {rollingBodyAverage(inBodyRecords, "weight_kg", record.date)?.toFixed(1) ?? "—"}kg avg
                    </Text>
                    <Text style={{ color: M3.colors.error, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {bodyCompEligible
                        ? `${rollingBodyAverage(comparableInBodyRecords, "body_fat_pct", record.date)?.toFixed(1) ?? "—"}% BF avg`
                        : "—"}
                    </Text>
                    <Text style={{ color: M3.colors.success, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {record.skeletal_muscle_mass_kg?.toFixed(1)}kg SMM
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {weightHistory.length === 0 && inBodyRecords.length === 0 && (
              <EmptyState
                icon="user"
                title={isCurrentWeek ? "No body data yet" : "No data for this week"}
                subtitle={isCurrentWeek ? "Log your daily weight or import an InBody report to start tracking." : "No weight or InBody data logged for this week."}
                actionLabel={isCurrentWeek ? "Log Weight" : undefined}
                onAction={isCurrentWeek ? () => router.push("/(tabs)/more?section=body") : undefined}
              />
            )}
          </>
        )}

        {/* ── Strength ── */}
        {activeSection === "strength" && (
          <>
            {weekPRs.length > 0 ? (
              <Card>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  {isCurrentWeek ? "THIS WEEK'S" : "WEEK"} PERSONAL RECORDS
                </Text>
                {weekPRs.map((pr) => (
                  <View
                    key={pr.exercise_name}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: M3.colors.surfaceVariant,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                        {pr.exercise_name}
                      </Text>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 }}>
                        {pr.achieved_date}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={{ color: "#FFD700", fontSize: 16, fontFamily: "BebasNeue_400Regular" }}>
                        {pr.best_weight_kg}kg × {pr.best_reps_at_best_weight}
                      </Text>
                      {!!pr.best_1rm_estimated && (
                        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                          ~{pr.best_1rm_estimated.toFixed(0)}kg 1RM
                        </Text>
                      )}
                      {pr.improvement_pct != null && pr.improvement_pct > 0 && (
                        <Text style={{ color: M3.colors.success, fontSize: 10, fontFamily: "DMSans_500Medium" }}>
                          +{pr.improvement_pct.toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <EmptyState
                icon="zap"
                title={isCurrentWeek ? "No PRs yet" : "No PRs this week"}
                subtitle={isCurrentWeek ? "Start logging workouts to track your personal records." : "No personal records achieved during this week."}
                actionLabel={isCurrentWeek ? "Start Workout" : undefined}
                onAction={isCurrentWeek ? () => router.push("/(tabs)/workout") : undefined}
              />
            )}
          </>
        )}

        {/* ── Nutrition ── */}
        {activeSection === "nutrition" && (
          <>
            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                {isCurrentWeek ? "THIS WEEK" : "WEEK"} NUTRITION SUMMARY
              </Text>
              {[
                { label: "Avg Daily Calories", value: `${nutritionSummary.avgDailyCalories.toFixed(0)} kcal`, target: `${targets.calories}` },
                { label: "Avg Daily Protein", value: `${nutritionSummary.avgDailyProtein.toFixed(0)}g`, target: `${targets.protein_g}g` },
                { label: "Protein Hit Rate", value: `${nutritionSummary.proteinHitRate.toFixed(0)}%`, target: "100%" },
                { label: "Best Streak", value: `${nutritionSummary.bestStreak} days`, target: "" },
                { label: "Current Streak", value: `${nutritionSummary.currentStreak} days`, target: "" },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: M3.colors.surfaceVariant }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    {item.label}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {item.value}
                    </Text>
                    {!!item.target && (
                      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                        / {item.target}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>

            <Card elevated>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
                PROTEIN ANALYSIS
              </Text>
              <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
                {nutritionSummary.proteinGapAnalysis}
              </Text>
            </Card>

            {weekNutritionHistory.length === 0 && (
              <EmptyState
                icon="pie-chart"
                title={isCurrentWeek ? "No nutrition data" : "No data for this week"}
                subtitle={isCurrentWeek ? "Start logging food to see your nutrition analytics." : "No nutrition data logged for this week."}
                actionLabel={isCurrentWeek ? "Log Food" : undefined}
                onAction={isCurrentWeek ? () => router.push("/(tabs)/nutrition") : undefined}
              />
            )}
          </>
        )}

        {/* ── Recovery ── */}
        {activeSection === "recovery" && (
          <>
            {weekRecoveryLogs.length > 0 ? (
              <>
                <Card>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                    {isCurrentWeek ? "THIS WEEK" : "WEEK"} SLEEP TREND
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 60 }}>
                    {weekRecoveryLogs.map((log, i) => {
                      const pct = Math.min(1, (log.sleep_duration_hr ?? 0) / 9);
                      const color = (log.sleep_duration_hr ?? 0) >= 7 ? M3.colors.success : (log.sleep_duration_hr ?? 0) >= 6 ? M3.colors.warning : M3.colors.error;
                      return (
                        <View key={i} style={{ flex: 1, alignItems: "center", gap: 3 }}>
                          <View style={{ width: "100%", height: Math.max(4, pct * 52), backgroundColor: color, borderRadius: 3 }} />
                          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 8, fontFamily: "DMSans_400Regular" }}>
                            {parseLocalDate(log.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>

                <Card>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                    RECOVERY AVERAGES
                  </Text>
                  {[
                    {
                      label: "Avg Sleep",
                      value: `${(weekRecoveryLogs.reduce((a, b) => a + (b.sleep_duration_hr ?? 0), 0) / weekRecoveryLogs.length).toFixed(1)}hr`,
                    },
                    {
                      label: "Avg Energy",
                      value: `${(weekRecoveryLogs.reduce((a, b) => a + (b.energy_level ?? 0), 0) / weekRecoveryLogs.length).toFixed(1)} / 5`,
                    },
                    {
                      label: "Avg Soreness",
                      value: `${(weekRecoveryLogs.reduce((a, b) => a + (b.muscle_soreness ?? 0), 0) / weekRecoveryLogs.length).toFixed(1)} / 5`,
                    },
                  ].map((item) => (
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: M3.colors.surfaceVariant }}>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{item.value}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : (
              <EmptyState
                icon="moon"
                title={isCurrentWeek ? "No recovery data" : "No data for this week"}
                subtitle={isCurrentWeek ? "Log your sleep and recovery daily to see trends." : "No recovery data logged for this week."}
                actionLabel={isCurrentWeek ? "Log Recovery" : undefined}
                onAction={isCurrentWeek ? () => router.push("/(tabs)/more") : undefined}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
