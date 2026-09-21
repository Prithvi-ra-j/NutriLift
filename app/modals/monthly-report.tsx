import { useState } from "react";
import { getTodayKey } from "../../lib/dates";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { generateMonthlyReport } from "../../lib/groq";
import { getUserProfile } from "../../lib/db/queries/profile";
import { getLast30DaysNutrition } from "../../lib/db/queries/nutrition";
import { getSessionsInRange, getAllPRs } from "../../lib/db/queries/workout";
import { getAllInBodyRecords, getWeightHistory } from "../../lib/db/queries/body";
import { getRecentRecoveryLogs, getSupplementAdherence30d } from "../../lib/db/queries/recovery";
import { insertReport } from "../../lib/db/queries/reports";
import { Card } from "../../components/ui/Card";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import { M3 } from "../../design-system/tokens";
import uuid from "react-native-uuid";
import type { MonthlyReport } from "../../lib/groq";

export default function MonthlyReportModal() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<MonthlyReport | null>(null);

  const currentMonth = getTodayKey().slice(0, 7); // YYYY-MM

  const generateReport = async () => {
    setIsGenerating(true);
    setProgress("Gathering your data...");

    try {
      const startDate = `${currentMonth}-01`;
      const endDate = getTodayKey();

      const [nutrition, sessions, prs, inBodyRecords, weightHistory, recoveryLogs, supplementAdherence, profile] =
        await Promise.all([
          getLast30DaysNutrition(),
          getSessionsInRange(startDate, endDate),
          getAllPRs(),
          getAllInBodyRecords(),
          getWeightHistory(30),
          getRecentRecoveryLogs(30),
          getSupplementAdherence30d(),
          getUserProfile(),
        ]);

      setProgress("Generating AI analysis...");
      if (!profile) throw new Error("Complete your profile before generating a monthly report.");

      const reportData = await generateMonthlyReport(profile, {
        month: currentMonth,
        nutrition_logs: nutrition,
        workout_sessions: sessions,
        personal_records: prs,
        inbody_records: inBodyRecords,
        weight_history: weightHistory,
        recovery_logs: recoveryLogs,
        supplement_adherence: supplementAdherence,
      });

      setProgress("Saving report...");
      const reportId = uuid.v4() as string;
      await insertReport({
        id: reportId,
        month: currentMonth,
        generated_at: Math.floor(Date.now() / 1000),
        report_json: JSON.stringify(reportData),
        pdf_path: null,
        ai_summary: reportData.ai_narrative ?? null,
        key_wins: JSON.stringify(reportData.executive_summary?.top_3_wins ?? []),
        key_adjustments: JSON.stringify(reportData.next_month_plan?.nutrition_adjustments ?? []),
      });

      setReport(reportData);
      setProgress("");
    } catch (err) {
      Alert.alert("Generation Failed", `Could not generate report: ${err instanceof Error ? err.message : "Unknown error"}`);
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
  };

  const execSummary = report?.executive_summary;
  const nutrition = report?.nutrition;
  const strength = report?.strength;
  const nextPlan = report?.next_month_plan;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader title="MONTHLY REPORT" />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!report && !isGenerating && (
          <>
            <Card>
              <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold", marginBottom: 8 }}>
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Report
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
                Generate a comprehensive AI analysis of your month — nutrition, strength, body composition, recovery, and a game plan for next month.
              </Text>
            </Card>

            <Button label="Generate Report" icon="cpu" onPress={generateReport} />
          </>
        )}

        {isGenerating && (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 16 }}>
            <ActivityIndicator size="large" color={M3.colors.primary} />
            <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_500Medium" }}>
              {progress}
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
              This may take up to 30 seconds
            </Text>
          </View>
        )}

        {report && (
          <>
            {/* Executive Summary */}
            {execSummary && (
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                    EXECUTIVE SUMMARY
                  </Text>
                  <View style={{ backgroundColor: M3.colors.primaryContainer, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: M3.colors.primary, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>
                      {execSummary.overall_score}/100
                    </Text>
                  </View>
                </View>
                <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold", marginBottom: 12, lineHeight: 22 }}>
                  {execSummary.headline}
                </Text>

                <Text style={{ color: M3.colors.success, fontSize: 12, fontFamily: "DMSans_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>
                  TOP WINS
                </Text>
                {execSummary.top_3_wins?.map((win, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                    <Feather name="check-circle" size={12} color={M3.colors.success} style={{ marginTop: 2 }} />
                    <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{win}</Text>
                  </View>
                ))}

                <Text style={{ color: M3.colors.warning, fontSize: 12, fontFamily: "DMSans_700Bold", marginTop: 12, marginBottom: 6, letterSpacing: 0.5 }}>
                  AREAS TO IMPROVE
                </Text>
                {execSummary.top_3_areas_to_improve?.map((area, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                    <Feather name="arrow-up-circle" size={12} color={M3.colors.warning} style={{ marginTop: 2 }} />
                    <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{area}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* AI Narrative */}
            {report.ai_narrative && (
              <Card elevated>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  COACH ASSESSMENT
                </Text>
                <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 22 }}>
                  {report.ai_narrative}
                </Text>
              </Card>
            )}

            {/* Next Month Plan */}
            {nextPlan && (
              <Card>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                  NEXT MONTH GAME PLAN
                </Text>
                {[
                  { label: "Nutrition", items: nextPlan.nutrition_adjustments, color: M3.colors.secondary },
                  { label: "Training", items: nextPlan.training_adjustments, color: M3.colors.tertiary },
                  { label: "Recovery", items: nextPlan.recovery_focus, color: M3.colors.success },
                ].map(({ label, items, color }) => (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <Text style={{ color, fontSize: 12, fontFamily: "DMSans_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>
                      {label.toUpperCase()}
                    </Text>
                    {items?.map((item, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                        <Text style={{ color, fontSize: 12 }}>→</Text>
                        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
