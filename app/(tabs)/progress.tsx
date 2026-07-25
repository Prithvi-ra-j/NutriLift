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
import { getAllPRs } from "../../lib/db/queries/workout";
import { getWeightHistory, getAllInBodyRecords } from "../../lib/db/queries/body";
import { getLast30DaysNutrition } from "../../lib/db/queries/nutrition";
import { getRecentRecoveryLogs } from "../../lib/db/queries/recovery";
import { computeNutritionSummary } from "../../lib/analytics/nutrition-analytics";
import { computeBodySummary } from "../../lib/analytics/body-analytics";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { PersonalRecord, BodyStat, DailyNutrition, RecoveryLog } from "../../lib/db/schema";

type ProgressSection = "strength" | "body" | "nutrition" | "recovery";

export default function ProgressScreen() {
  const [activeSection, setActiveSection] = useState<ProgressSection>("body");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Week navigation state
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [weightHistory, setWeightHistory] = useState<BodyStat[]>([]);
  const [inBodyRecords, setInBodyRecords] = useState<BodyStat[]>([]);
  const [nutritionHistory, setNutritionHistory] = useState<DailyNutrition[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);

  // Get week range for selected date
  const getWeekRange = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
      monday,
      sunday,
    };
  };

  const weekRange = getWeekRange(selectedDate);
  const isCurrentWeek = weekRange.start === getWeekRange(todayStr).start;

  const loadData = useCallback(async () => {
    try {
      const [prsData, weightData, inBodyData, nutritionData, recoveryData] = await Promise.all([
        getAllPRs(),
        getWeightHistory(90), // Get 90 days to cover multiple weeks
        getAllInBodyRecords(),
        getLast30DaysNutrition(),
        getRecentRecoveryLogs(30), // Get 30 days to cover multiple weeks
      ]);
      setPRs(prsData);
      setWeightHistory(weightData);
      setInBodyRecords(inBodyData);
      setNutritionHistory(nutritionData);
      setRecoveryLogs(recoveryData);
    } catch (err) {
      console.error("Progress load error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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

  const goToPreviousWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    setSelectedDate(prev.toISOString().split("T")[0]);
  };

  const goToNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    setSelectedDate(next.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(todayStr);
  };

  const sections: { key: ProgressSection; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "body", label: "Body", icon: "user" },
    { key: "strength", label: "Strength", icon: "zap" },
    { key: "nutrition", label: "Nutrition", icon: "pie-chart" },
    { key: "recovery", label: "Recovery", icon: "moon" },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
        <View style={{ padding: 20, gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00D4AA" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F0F0F5", fontSize: 28, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
            PROGRESS
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={goToToday}
              style={{
                backgroundColor: "#00D4AA22",
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: "#00D4AA",
              }}
            >
              <Text style={{ color: "#00D4AA", fontSize: 11, fontFamily: "DMSans_700Bold" }}>
                THIS WEEK
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Week Navigation ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <TouchableOpacity
              onPress={goToPreviousWeek}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#12121A",
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: "#252535",
              }}
            >
              <Feather name="chevrons-left" size={14} color="#8080A0" />
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                Prev Week
              </Text>
            </TouchableOpacity>
            
            <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
              {isCurrentWeek ? "This Week" : `Week of ${weekRange.monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </Text>
            
            <TouchableOpacity
              onPress={goToNextWeek}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#12121A",
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: "#252535",
              }}
            >
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                Next Week
              </Text>
              <Feather name="chevrons-right" size={14} color="#8080A0" />
            </TouchableOpacity>
          </View>

        {/* ── Section Tabs ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.key}
              onPress={() => setActiveSection(s.key)}
              style={{
                flex: 1,
                backgroundColor: activeSection === s.key ? "#00D4AA22" : "#12121A",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: activeSection === s.key ? "#00D4AA" : "#252535",
                padding: 10,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Feather name={s.icon} size={16} color={activeSection === s.key ? "#00D4AA" : "#8080A0"} />
              <Text style={{ color: activeSection === s.key ? "#00D4AA" : "#8080A0", fontSize: 10, fontFamily: "DMSans_500Medium" }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Body Composition ── */}
        {activeSection === "body" && (
          <>
            {/* Current stats */}
            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                BODY COMPOSITION
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { label: "Weight", value: bodySummary.currentWeight ? `${bodySummary.currentWeight.toFixed(1)}kg` : "—", color: "#F0F0F5" },
                  { label: "Body Fat", value: latestInBody?.body_fat_pct ? `${latestInBody.body_fat_pct.toFixed(1)}%` : "—", color: "#FF4757" },
                  { label: "Muscle", value: latestInBody?.skeletal_muscle_mass_kg ? `${latestInBody.skeletal_muscle_mass_kg.toFixed(1)}kg` : "—", color: "#00C875" },
                  { label: "InBody", value: latestInBody?.inbody_score ? `${latestInBody.inbody_score}` : "—", color: "#00D4AA" },
                ].map((stat) => (
                  <View key={stat.label} style={{ alignItems: "center" }}>
                    <Text style={{ color: stat.color, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                      {stat.value}
                    </Text>
                    <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Goal projection */}
            <Card elevated>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Feather name="target" size={16} color="#00D4AA" />
                <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                  December 2026 Goal
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    Target Body Fat
                  </Text>
                  <Text style={{ color: "#00D4AA", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    {USER_PROFILE.targets.body_fat_pct_dec2026}%
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    Current Body Fat
                  </Text>
                  <Text style={{ color: latestInBody?.body_fat_pct ? "#FF4757" : "#8080A0", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    {latestInBody?.body_fat_pct ? `${latestInBody.body_fat_pct.toFixed(1)}%` : "No InBody data"}
                  </Text>
                </View>
                {bodySummary.projectedBFDate && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                      Projected Date
                    </Text>
                    <Text style={{ color: bodySummary.onTrackForGoal ? "#00C875" : "#FFB800", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {new Date(bodySummary.projectedBFDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    Trend
                  </Text>
                  <Text style={{
                    color: bodySummary.trend === "losing" ? "#00C875" : bodySummary.trend === "gaining" ? "#FF4757" : "#FFB800",
                    fontSize: 13,
                    fontFamily: "DMSans_700Bold",
                    textTransform: "capitalize",
                  }}>
                    {bodySummary.trend}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Weight history mini chart */}
            {weekWeightHistory.length > 0 && (
              <Card>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  {isCurrentWeek ? "THIS WEEK" : "WEEK"} WEIGHT TREND
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 60 }}>
                  {weekWeightHistory.map((stat, i) => {
                    const weights = weekWeightHistory.map((s) => s.weight_kg ?? 0).filter(Boolean);
                    const min = Math.min(...weights);
                    const max = Math.max(...weights);
                    const range = max - min || 1;
                    const pct = ((stat.weight_kg ?? min) - min) / range;
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: Math.max(4, pct * 50 + 10),
                          backgroundColor: "#00D4AA44",
                          borderRadius: 2,
                          borderTopWidth: 2,
                          borderTopColor: "#00D4AA",
                        }}
                      />
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: "#4A4A6A", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                    Mon
                  </Text>
                  <Text style={{ color: "#4A4A6A", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                    Sun
                  </Text>
                </View>
                {weekWeightHistory.length > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                      Start: {weekWeightHistory[0]?.weight_kg?.toFixed(1)}kg
                    </Text>
                    <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                      End: {weekWeightHistory[weekWeightHistory.length - 1]?.weight_kg?.toFixed(1)}kg
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* InBody history */}
            {inBodyRecords.length > 1 && (
              <Card>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
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
                      borderBottomColor: "#1A1A26",
                    }}
                  >
                    <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                      {record.date}
                    </Text>
                    <Text style={{ color: "#F0F0F5", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {record.weight_kg?.toFixed(1)}kg
                    </Text>
                    <Text style={{ color: "#FF4757", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {record.body_fat_pct?.toFixed(1)}% BF
                    </Text>
                    <Text style={{ color: "#00C875", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
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
              />
            )}
          </>
        )}

        {/* ── Strength ── */}
        {activeSection === "strength" && (
          <>
            {weekPRs.length > 0 ? (
              <Card>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
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
                      borderBottomColor: "#1A1A26",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                        {pr.exercise_name}
                      </Text>
                      <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 }}>
                        {pr.achieved_date}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={{ color: "#FFD700", fontSize: 16, fontFamily: "BebasNeue_400Regular" }}>
                        {pr.best_weight_kg}kg × {pr.best_reps_at_best_weight}
                      </Text>
                      {!!pr.best_1rm_estimated && (
                        <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                          ~{pr.best_1rm_estimated.toFixed(0)}kg 1RM
                        </Text>
                      )}
                      {pr.improvement_pct != null && pr.improvement_pct > 0 && (
                        <Text style={{ color: "#00C875", fontSize: 10, fontFamily: "DMSans_500Medium" }}>
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
              />
            )}
          </>
        )}

        {/* ── Nutrition ── */}
        {activeSection === "nutrition" && (
          <>
            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                {isCurrentWeek ? "THIS WEEK" : "WEEK"} NUTRITION SUMMARY
              </Text>
              {[
                { label: "Avg Daily Calories", value: `${nutritionSummary.avgDailyCalories.toFixed(0)} kcal`, target: `${USER_PROFILE.targets.calories}` },
                { label: "Avg Daily Protein", value: `${nutritionSummary.avgDailyProtein.toFixed(0)}g`, target: `${USER_PROFILE.targets.protein_g}g` },
                { label: "Protein Hit Rate", value: `${nutritionSummary.proteinHitRate.toFixed(0)}%`, target: "100%" },
                { label: "Best Streak", value: `${nutritionSummary.bestStreak} days`, target: "" },
                { label: "Current Streak", value: `${nutritionSummary.currentStreak} days`, target: "" },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A1A26" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                    {item.label}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {item.value}
                    </Text>
                    {!!item.target && (
                      <Text style={{ color: "#4A4A6A", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                        / {item.target}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>

            <Card elevated>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
                PROTEIN ANALYSIS
              </Text>
              <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
                {nutritionSummary.proteinGapAnalysis}
              </Text>
            </Card>

            {weekNutritionHistory.length === 0 && (
              <EmptyState
                icon="pie-chart"
                title={isCurrentWeek ? "No nutrition data" : "No data for this week"}
                subtitle={isCurrentWeek ? "Start logging food to see your nutrition analytics." : "No nutrition data logged for this week."}
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
                  <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                    {isCurrentWeek ? "THIS WEEK" : "WEEK"} SLEEP TREND
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 60 }}>
                    {weekRecoveryLogs.map((log, i) => {
                      const pct = Math.min(1, (log.sleep_duration_hr ?? 0) / 9);
                      const color = (log.sleep_duration_hr ?? 0) >= 7 ? "#00C875" : (log.sleep_duration_hr ?? 0) >= 6 ? "#FFB800" : "#FF4757";
                      return (
                        <View key={i} style={{ flex: 1, alignItems: "center", gap: 3 }}>
                          <View style={{ width: "100%", height: Math.max(4, pct * 52), backgroundColor: color, borderRadius: 3 }} />
                          <Text style={{ color: "#4A4A6A", fontSize: 8, fontFamily: "DMSans_400Regular" }}>
                            {new Date(log.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>

                <Card>
                  <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
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
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A1A26" }}>
                      <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                      <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_700Bold" }}>{item.value}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : (
              <EmptyState
                icon="moon"
                title={isCurrentWeek ? "No recovery data" : "No data for this week"}
                subtitle={isCurrentWeek ? "Log your sleep and recovery daily to see trends." : "No recovery data logged for this week."}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
