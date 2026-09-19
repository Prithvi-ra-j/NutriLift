import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from "react-native";
import { Input } from "../../components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { getGroqApiKey, setGroqApiKey } from "../../lib/groq/client";
import { insertBodyStat, getLatestWeight } from "../../lib/db/queries/body";
import { getSupplementLogsForDate, upsertSupplementLog, getRecoveryLog, upsertRecoveryLog } from "../../lib/db/queries/recovery";
import { getAllReports } from "../../lib/db/queries/reports";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { Card } from "../../components/ui/Card";
import type { SupplementLog, MonthlyReport } from "../../lib/db/schema";
import uuid from "react-native-uuid";
import { syncToSupabase } from "../../lib/integrations/life-os/syncClient";
import { isSupabaseConfigured } from "../../lib/supabase/client";

type MoreSection = "body" | "supplements" | "recovery" | "reports" | "settings";

export default function MoreScreen() {
  const today = new Date().toISOString().split("T")[0];
  const [activeSection, setActiveSection] = useState<MoreSection>("body");
  const [apiKeyInput, setApiKeyInput] = useState(getGroqApiKey() || "");

  // Body stats
  const [weightInput, setWeightInput] = useState("");
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // Supplements
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);

  // Recovery
  const [sleepHr, setSleepHr] = useState("7");
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [recoveryNotes, setRecoveryNotes] = useState("");
  const [recoverySaved, setRecoverySaved] = useState(false);

  // Reports
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Not synced yet");

  const loadData = useCallback(async () => {
    const [weight, suppLogs, recoveryLog, reportsData] = await Promise.all([
      getLatestWeight(),
      getSupplementLogsForDate(today),
      getRecoveryLog(today),
      getAllReports(),
    ]);

    setLatestWeight(weight?.weight_kg ?? null);
    setSupplementLogs(suppLogs);
    setReports(reportsData);

    if (recoveryLog) {
      setSleepHr(recoveryLog.sleep_duration_hr?.toString() ?? "7");
      setSleepQuality(recoveryLog.sleep_quality ?? 3);
      setEnergyLevel(recoveryLog.energy_level ?? 3);
      setSoreness(recoveryLog.muscle_soreness ?? 3);
      setStressLevel(recoveryLog.stress_level ?? 3);
      setRecoveryNotes(recoveryLog.notes ?? "");
      setRecoverySaved(true);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const logWeight = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      Alert.alert("Invalid Weight", "Enter a valid weight in kg.");
      return;
    }
    await insertBodyStat({
      id: uuid.v4() as string,
      date: today,
      type: "weight",
      weight_kg: weight,
      body_fat_pct: null,
      body_fat_mass_kg: null,
      skeletal_muscle_mass_kg: null,
      lean_body_mass_kg: null,
      bmi: null,
      inbody_score: null,
      tbw_l: null,
      ecw_tbw_ratio: null,
      visceral_fat_level: null,
      seg_muscle_right_arm: null,
      seg_muscle_left_arm: null,
      seg_muscle_trunk: null,
      seg_muscle_right_leg: null,
      seg_muscle_left_leg: null,
      seg_fat_right_arm: null,
      seg_fat_left_arm: null,
      seg_fat_trunk: null,
      seg_fat_right_leg: null,
      seg_fat_left_leg: null,
      raw_paste: null,
      source: "manual",
    });
    setLatestWeight(weight);
    setWeightInput("");
    Alert.alert("Logged", `Weight ${weight}kg saved.`);
  };

  const toggleSupplement = async (supplementName: string, currentTaken: boolean) => {
    await upsertSupplementLog(today, supplementName, !currentTaken);
    const updated = await getSupplementLogsForDate(today);
    setSupplementLogs(updated);
  };

  const saveRecovery = async () => {
    await upsertRecoveryLog({
      date: today,
      sleep_duration_hr: parseFloat(sleepHr) || null,
      sleep_quality: sleepQuality,
      bedtime: null,
      wake_time: null,
      hrv: null,
      resting_hr: null,
      energy_level: energyLevel,
      muscle_soreness: soreness,
      stress_level: stressLevel,
      notes: recoveryNotes || null,
    });
    setRecoverySaved(true);
    Alert.alert("Saved", "Recovery log saved.");
  };

  const syncNow = async () => {
    setIsSyncing(true);
    const result = await syncToSupabase();
    setIsSyncing(false);

    if (result.error) {
      setSyncStatus(result.error);
      Alert.alert("Sync unavailable", result.error);
      return;
    }

    setSyncStatus(`Uploaded ${result.uploaded}, skipped ${result.skipped}`);
    Alert.alert("Sync complete", `Uploaded ${result.uploaded} record${result.uploaded === 1 ? "" : "s"}.`);
  };

  const sections: { key: MoreSection; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "body", label: "Body", icon: "user" },
    { key: "supplements", label: "Supps", icon: "package" },
    { key: "recovery", label: "Recovery", icon: "moon" },
    { key: "reports", label: "Reports", icon: "file-text" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  const RatingRow = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>{label}</Text>
        <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_700Bold" }}>{value} / 5</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 6,
              backgroundColor: value >= v ? "#00D4AA22" : "#1A1A26",
              borderWidth: 1,
              borderColor: value >= v ? "#00D4AA" : "#252535",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: value >= v ? "#00D4AA" : "#4A4A6A", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Text style={{ color: "#F0F0F5", fontSize: 28, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
          MORE
        </Text>

        {/* ── Section Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {sections.map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setActiveSection(s.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: activeSection === s.key ? "#00D4AA22" : "#12121A",
                  borderWidth: 1,
                  borderColor: activeSection === s.key ? "#00D4AA" : "#252535",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Feather name={s.icon} size={14} color={activeSection === s.key ? "#00D4AA" : "#8080A0"} />
                <Text style={{ color: activeSection === s.key ? "#00D4AA" : "#8080A0", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Body Stats ── */}
        {activeSection === "body" && (
          <>
            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                DAILY WEIGHT
              </Text>
              {latestWeight && (
                <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 10 }}>
                  Last logged: <Text style={{ color: "#F0F0F5", fontFamily: "DMSans_700Bold" }}>{latestWeight}kg</Text>
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Input
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="Enter weight (kg)"
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    backgroundColor: "#1A1A26",
                    fontSize: 16,
                    fontFamily: "BebasNeue_400Regular",
                  }}
                />
                <TouchableOpacity
                  onPress={logWeight}
                  style={{
                    backgroundColor: "#00D4AA",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#0A0A0F", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    Log
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            <TouchableOpacity
              onPress={() => router.push("/modals/inbody-paste")}
              style={{
                backgroundColor: "#12121A",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#252535",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#00D4AA22", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="clipboard" size={18} color="#00D4AA" />
                </View>
                <View>
                  <Text style={{ color: "#F0F0F5", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    Import InBody Report
                  </Text>
                  <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    Paste from Claude or ChatGPT
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#4A4A6A" />
            </TouchableOpacity>
          </>
        )}

        {/* ── Supplements ── */}
        {activeSection === "supplements" && (
          <Card>
            <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
              TODAY'S SUPPLEMENTS
            </Text>
            {USER_PROFILE.supplements.map((supp) => {
              const log = supplementLogs.find((l) => l.supplement_name === supp.name);
              const taken = log?.taken === 1;
              return (
                <View
                  key={supp.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#1A1A26",
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleSupplement(supp.name, taken)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: taken ? "#00C87522" : "#1A1A26",
                      borderWidth: 2,
                      borderColor: taken ? "#00C875" : "#252535",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {taken && <Feather name="check" size={20} color="#00C875" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: taken ? "#F0F0F5" : "#8080A0", fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                      {supp.name}
                    </Text>
                    <Text style={{ color: "#4A4A6A", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 }}>
                      {supp.dose} · {supp.timing}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ── Recovery ── */}
        {activeSection === "recovery" && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                RECOVERY LOG
              </Text>
              {recoverySaved && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="check-circle" size={12} color="#00C875" />
                  <Text style={{ color: "#00C875", fontSize: 11, fontFamily: "DMSans_400Regular" }}>Saved</Text>
                </View>
              )}
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                Sleep Duration (hours)
              </Text>
              <Input
                value={sleepHr}
                onChangeText={setSleepHr}
                keyboardType="decimal-pad"
                placeholder="7.5"
                style={{
                  backgroundColor: "#1A1A26",
                  fontSize: 16,
                  fontFamily: "BebasNeue_400Regular",
                }}
              />
            </View>

            <RatingRow label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} />
            <RatingRow label="Energy Level" value={energyLevel} onChange={setEnergyLevel} />
            <RatingRow label="Muscle Soreness" value={soreness} onChange={setSoreness} />
            <RatingRow label="Stress Level" value={stressLevel} onChange={setStressLevel} />

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                Notes (optional)
              </Text>
              <Input
                value={recoveryNotes}
                onChangeText={setRecoveryNotes}
                placeholder="How are you feeling?"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: "#1A1A26",
                  textAlignVertical: "top",
                  minHeight: 80,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={saveRecovery}
              style={{
                backgroundColor: "#00D4AA",
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#0A0A0F", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                Save Recovery Log
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Reports ── */}
        {activeSection === "reports" && (
          <>
            <TouchableOpacity
              onPress={() => router.push("/modals/monthly-report")}
              style={{
                backgroundColor: "#00D4AA22",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#00D4AA44",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Feather name="file-text" size={20} color="#00D4AA" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#00D4AA", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  Generate Monthly Report
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  AI-powered analysis of your month
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#00D4AA" />
            </TouchableOpacity>

            {reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: "#F0F0F5", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                        {report.month}
                      </Text>
                      <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                        Generated {new Date(report.generated_at * 1000).toLocaleDateString()}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#4A4A6A" />
                  </View>
                </Card>
              ))
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ color: "#4A4A6A", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                  No reports generated yet
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Settings ── */}
        {activeSection === "settings" && (
          <>
            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                PROFILE
              </Text>
              {[
                { label: "Name", value: USER_PROFILE.name },
                { label: "Age", value: `${USER_PROFILE.age}` },
                { label: "Height", value: `${USER_PROFILE.height_cm}cm` },
                { label: "Training Since", value: USER_PROFILE.training_start_date },
                { label: "Current Split", value: USER_PROFILE.training.current_split },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A26" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Text style={{ color: "#F0F0F5", fontSize: 13, fontFamily: "DMSans_500Medium" }}>{item.value}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                TARGETS
              </Text>
              {[
                { label: "Calories", value: `${USER_PROFILE.targets.calories} kcal` },
                { label: "Protein", value: `${USER_PROFILE.targets.protein_g}g` },
                { label: "Carbs", value: `${USER_PROFILE.targets.carbs_g}g` },
                { label: "Fat", value: `${USER_PROFILE.targets.fat_g}g` },
                { label: "BF% Goal (Dec 2026)", value: `${USER_PROFILE.targets.body_fat_pct_dec2026}%` },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A26" }}>
                  <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Text style={{ color: "#00D4AA", fontSize: 13, fontFamily: "DMSans_700Bold" }}>{item.value}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                STRUCTURAL NOTES
              </Text>
              {USER_PROFILE.structural_notes.map((note, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, paddingVertical: 6 }}>
                  <Feather name="alert-circle" size={12} color="#FFB800" style={{ marginTop: 2 }} />
                  <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 18 }}>
                    {note}
                  </Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                API CONFIGURATION
              </Text>
              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                Groq API Key
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="gsk_..."
                  placeholderTextColor="#4A4A6A"
                  secureTextEntry={true}
                  style={{
                    flex: 1,
                    backgroundColor: "#1A1A26",
                    borderRadius: 8,
                    padding: 12,
                    color: "#F0F0F5",
                    fontSize: 14,
                    fontFamily: "DMSans_400Regular",
                    borderWidth: 1,
                    borderColor: "#252535",
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    setGroqApiKey(apiKeyInput);
                    Alert.alert("Saved", "Groq API Key updated successfully.");
                  }}
                  style={{
                    backgroundColor: "#00D4AA",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#0A0A0F", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View>
                  <Text style={{ color: "#F0F0F5", fontSize: 15, fontFamily: "DMSans_700Bold" }}>NutriLift Sync</Text>
                  <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 3 }}>
                    {isSupabaseConfigured ? syncStatus : "Supabase is not configured"}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Sync NutriLift data now"
                  disabled={!isSupabaseConfigured || isSyncing}
                  onPress={syncNow}
                  style={{
                    backgroundColor: isSupabaseConfigured ? "#00D4AA" : "#252535",
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: isSupabaseConfigured ? "#0A0A0F" : "#8080A0", fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                    {isSyncing ? "Syncing" : "Sync now"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: "#4A4A6A", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                Sign in with your shared Supabase account before syncing.
              </Text>
            </Card>

            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  "Export Progress Report",
                  "Choose export period",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Last 30 Days",
                      onPress: async () => {
                        const { exportLast30Days } = await import("../../lib/export/generate-progress-pdf");
                        const result = await exportLast30Days();
                        if (result.success) {
                          Alert.alert("Success", "PDF exported and ready to share!");
                        } else {
                          Alert.alert("Error", result.error || "Failed to export PDF");
                        }
                      },
                    },
                    {
                      text: "Current Month",
                      onPress: async () => {
                        const { exportCurrentMonth } = await import("../../lib/export/generate-progress-pdf");
                        const result = await exportCurrentMonth();
                        if (result.success) {
                          Alert.alert("Success", "PDF exported and ready to share!");
                        } else {
                          Alert.alert("Error", result.error || "Failed to export PDF");
                        }
                      },
                    },
                    {
                      text: "All Data",
                      onPress: async () => {
                        const { exportAllData } = await import("../../lib/export/generate-progress-pdf");
                        const result = await exportAllData();
                        if (result.success) {
                          Alert.alert("Success", "PDF exported and ready to share!");
                        } else {
                          Alert.alert("Error", result.error || "Failed to export PDF");
                        }
                      },
                    },
                  ]
                );
              }}
              style={{
                backgroundColor: "#12121A",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#252535",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#00D4AA22", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="download" size={18} color="#00D4AA" />
                </View>
                <View>
                  <Text style={{ color: "#F0F0F5", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    Export Progress PDF
                  </Text>
                  <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    All logs & progress data
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#4A4A6A" />
            </TouchableOpacity>

            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <Text style={{ color: "#4A4A6A", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                NutriLift v1.0 · Built for Prithvi · May 2026
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
