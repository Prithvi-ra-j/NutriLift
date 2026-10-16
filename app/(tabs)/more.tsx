import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { Input } from "../../components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { insertBodyStat, getLatestWeight } from "../../lib/db/queries/body";
import { getSupplementLogsForDate, upsertSupplementLog, getRecoveryLog, upsertRecoveryLog } from "../../lib/db/queries/recovery";
import { getAllReports } from "../../lib/db/queries/reports";
import { USER_PROFILE } from "../../lib/constants/user-profile";
import { Card } from "../../components/ui/Card";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { ListRow } from "../../components/ui/ListRow";
import type { SupplementLog, MonthlyReport } from "../../lib/db/schema";
import uuid from "react-native-uuid";
import { processSyncQueue } from "../../lib/integrations/life-os/syncClient";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { getCurrentSession, signInWithEmail, signOut } from "../../lib/supabase/auth";
import { M3 } from "../../design-system/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalDateKey } from "../../lib/utils/local-date";
import { DEFAULT_NUTRITION_TARGETS, getNutritionTargets, saveNutritionTargets, type NutritionTargets } from "../../lib/db/queries/nutrition-targets";
import { getAdaptiveTargetSuggestion } from "../../lib/nutrition/adaptive-target-service";
import { getUserProfile, updateUserProfile, type PersistedUserProfile, type ProfileSex } from "../../lib/db/queries/user-profile";

type MoreSection = "menu" | "body" | "supplements" | "recovery" | "reports" | "account" | "settings";
const VALID_SECTIONS: MoreSection[] = ["menu", "body", "supplements", "recovery", "reports", "account", "settings"];

export default function MoreScreen() {
  const today = toLocalDateKey();
  const params = useLocalSearchParams<{ section?: string }>();
  const [activeSection, setActiveSection] = useState<MoreSection>("menu");
  // Body stats
  const [weightInput, setWeightInput] = useState("");
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);
  const [targetInputs, setTargetInputs] = useState({ calories: String(DEFAULT_NUTRITION_TARGETS.calories), protein: String(DEFAULT_NUTRITION_TARGETS.protein_g), carbs: String(DEFAULT_NUTRITION_TARGETS.carbs_g), fat: String(DEFAULT_NUTRITION_TARGETS.fat_g) });
  const [targetsSaving, setTargetsSaving] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [persistedProfile, setPersistedProfile] = useState<PersistedUserProfile | null>(null);
  const [profileInputs, setProfileInputs] = useState({
    age: "", sex: "", height_cm: "", training_start_date: "", current_split: "",
    training_phase: "", cardio: "", equipment: "", physique_goal: "", body_fat_goal_pct: "", body_fat_goal_date: "",
  });

  // Supplements
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);

  // Recovery
  const [sleepHr, setSleepHr] = useState("");
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [recoveryNotes, setRecoveryNotes] = useState("");
  const [recoverySaved, setRecoverySaved] = useState(false);

  // Reports
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Not synced yet");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isWeb = Platform.OS === "web";

  // Groq API Key
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [groqKeySaved, setGroqKeySaved] = useState(false);
  const [isVerifyingGroq, setIsVerifyingGroq] = useState(false);

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
      setSleepHr(recoveryLog.sleep_duration_hr?.toString() ?? "");
      setSleepQuality(recoveryLog.sleep_quality ?? null);
      setEnergyLevel(recoveryLog.energy_level ?? null);
      setSoreness(recoveryLog.muscle_soreness ?? null);
      setStressLevel(recoveryLog.stress_level ?? null);
      setRecoveryNotes(recoveryLog.notes ?? "");
      setRecoverySaved(true);
    }
  }, [today]);

  useEffect(() => {
    loadData();
    getUserProfile().then((profile) => {
      setPersistedProfile(profile);
      setProfileInputs({
        age: profile?.age == null ? "" : String(profile.age),
        sex: profile?.sex ?? "",
        height_cm: profile?.height_cm == null ? "" : String(profile.height_cm),
        training_start_date: profile?.training_start_date ?? "",
        current_split: profile?.current_split ?? "",
        training_phase: profile?.training_phase ?? "",
        cardio: profile?.cardio ?? "",
        equipment: profile?.equipment ?? "",
        physique_goal: profile?.physique_goal ?? "",
        body_fat_goal_pct: profile?.body_fat_goal_pct == null ? "" : String(profile.body_fat_goal_pct),
        body_fat_goal_date: profile?.body_fat_goal_date ?? "",
      });
    }).catch((error) => Alert.alert("Profile unavailable", error instanceof Error ? error.message : "Could not load saved profile."));
    getNutritionTargets().then((targets) => {
      setNutritionTargets(targets);
      setTargetInputs({ calories: String(targets.calories), protein: String(targets.protein_g), carbs: String(targets.carbs_g), fat: String(targets.fat_g) });
    }).catch(() => {
      Alert.alert("Targets unavailable", "Could not load saved nutrition targets. Default targets remain active.");
    });
  }, [loadData]);

  useEffect(() => {
    // Reads the locally persisted session (no network call) so sign-in survives app restarts / pull-to-refresh.
    getCurrentSession().then(({ data }) => {
      setSignedInEmail(data.session?.user.email ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (params.section && VALID_SECTIONS.includes(params.section as MoreSection)) {
      setActiveSection(params.section as MoreSection);
    }
  }, [params.section]);

  useEffect(() => {
    AsyncStorage.getItem("GROQ_API_KEY").then((key) => {
      if (key) setGroqKeySaved(true);
    });
  }, []);

  const applyAdaptiveTargetSuggestion = async (originalTargets: NutritionTargets, suggestedCalories: number) => {
    try {
      const currentTargets = await getNutritionTargets();
      if (JSON.stringify(currentTargets) !== JSON.stringify(originalTargets)) {
        Alert.alert("Targets changed", "Saved targets changed after this suggestion was calculated. Review a fresh suggestion before applying it.");
        return;
      }
      const fresh = await getAdaptiveTargetSuggestion();
      if (fresh.status !== "ready" || fresh.suggestedTargetKcal === null || fresh.maintenanceKcal === null || fresh.suggestedTargetKcal !== suggestedCalories) {
        Alert.alert("Suggestion changed", fresh.reason);
        return;
      }
      const nextTargets: NutritionTargets = { ...currentTargets, calories: fresh.suggestedTargetKcal, mode: "adaptive" };
      await saveNutritionTargets(nextTargets, { source: "adaptive", effectiveDate: today, maintenanceEstimateKcal: fresh.maintenanceKcal, algorithmVersion: fresh.algorithmVersion, explanation: fresh.reason });
      setNutritionTargets(nextTargets);
      setTargetInputs((current) => ({ ...current, calories: String(nextTargets.calories) }));
      Alert.alert("Target updated", `Your calorie target is now ${nextTargets.calories} kcal. Other macro targets were left unchanged.`);
    } catch (error) {
      Alert.alert("Could not apply suggestion", error instanceof Error ? error.message : "The target was not changed.");
    }
  };

  const handleReviewAdaptiveTarget = async () => {
    setSuggestionLoading(true);
    try {
      const currentTargets = await getNutritionTargets();
      const suggestion = await getAdaptiveTargetSuggestion();
      if (suggestion.status !== "ready" || suggestion.suggestedTargetKcal === null || suggestion.maintenanceKcal === null) {
        Alert.alert("More data needed", suggestion.reason);
        return;
      }
      if (suggestion.suggestedTargetKcal === currentTargets.calories) {
        Alert.alert("No change recommended", suggestion.reason);
        return;
      }
      Alert.alert("Review adaptive target", `Current target: ${currentTargets.calories} kcal\nSuggested target: ${suggestion.suggestedTargetKcal} kcal\nEstimated maintenance: ${suggestion.maintenanceKcal} kcal\n\n${suggestion.reason}`, [
        { text: "Keep current", style: "cancel" },
        { text: "Apply suggestion", onPress: () => { void applyAdaptiveTargetSuggestion(currentTargets, suggestion.suggestedTargetKcal!); } },
      ]);
    } catch (error) {
      Alert.alert("Could not calculate suggestion", error instanceof Error ? error.message : "The target suggestion could not be calculated.");
    } finally {
      setSuggestionLoading(false);
    }
  };
  const handleVerifyGroq = async () => {
    if (!groqKeyInput.trim()) {
      Alert.alert("Missing Key", "Enter a Groq API Key.");
      return;
    }
    setIsVerifyingGroq(true);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKeyInput.trim()}` },
      });
      if (response.ok) {
        await AsyncStorage.setItem("GROQ_API_KEY", groqKeyInput.trim());
        setGroqKeySaved(true);
        setGroqKeyInput("");
        Alert.alert("Success", "Groq API Key verified and saved.");
      } else {
        Alert.alert("Invalid Key", "Could not verify this API key with Groq.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error while verifying key.");
    } finally {
      setIsVerifyingGroq(false);
    }
  };

  const handleClearGroq = async () => {
    await AsyncStorage.removeItem("GROQ_API_KEY");
    setGroqKeySaved(false);
    Alert.alert("Removed", "Groq API Key removed from device.");
  };

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
      sleep_duration_hr: sleepHr.trim() ? Number(sleepHr) : null,
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
    try {
      const result = await processSyncQueue();
      const summary = `Uploaded ${result.uploaded}; ${result.needsAttention} need attention`;
      setSyncStatus(result.error ? `${summary}. Retryable errors remain queued.` : summary);

      if (result.error) {
        Alert.alert(
          result.uploaded > 0 ? "Sync partially completed" : "Sync needs attention",
          `${result.uploaded} record(s) uploaded. ${result.needsAttention} invalid record(s) were quarantined. Retryable records remain on this device. ${result.error}`,
        );
      } else if (result.needsAttention > 0) {
        Alert.alert(
          "Sync completed with records to review",
          `${result.uploaded} record(s) uploaded. ${result.needsAttention} invalid record(s) were kept locally for attention rather than silently discarded.`,
        );
      } else {
        Alert.alert("Sync complete", `Uploaded ${result.uploaded} record${result.uploaded === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed unexpectedly.";
      setSyncStatus(message);
      Alert.alert("Sync failed", message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your Supabase email and password.");
      return;
    }

    setIsAuthenticating(true);
    const { data, error } = await signInWithEmail(email.trim(), password);
    setIsAuthenticating(false);

    if (error || !data.user) {
      Alert.alert("Sign-in failed", error?.message || "Could not start a Supabase session.");
      return;
    }

    setPassword("");
    setSignedInEmail(data.user.email ?? email.trim());
    setSyncStatus("Ready to sync");
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      Alert.alert("Sign-out failed", error.message);
      return;
    }

    setSignedInEmail(null);
    setSyncStatus("Sign in before syncing");
  };

  const sections: { key: MoreSection; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "body", label: "Body", icon: "user" },
    { key: "supplements", label: "Supps", icon: "package" },
    { key: "recovery", label: "Recovery", icon: "moon" },
    { key: "reports", label: "Reports", icon: "file-text" },
    { key: "account", label: "Account", icon: "cloud" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  const RatingRow = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) => (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{label}</Text>
        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{value == null ? "Not logged" : `${value} / 5`}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 6,
              backgroundColor: value != null && value >= v ? M3.colors.primary + "22" : M3.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: value != null && value >= v ? M3.colors.primary : M3.colors.outline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: value != null && value >= v ? M3.colors.primary : M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => onChange(null)} accessibilityRole="button" style={{ alignSelf: "flex-end", paddingVertical: 4 }}>
        <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11 }}>Clear / not logged</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        {activeSection === "menu" ? (
          <ScreenHeader title="MORE" subtitle="Settings, reports, and more" />
        ) : (
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => setActiveSection("menu")} 
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
            >
              <Feather name="chevron-left" size={20} color={M3.colors.primary} />
              <Text style={{ color: M3.colors.primary, fontSize: 15, fontFamily: "DMSans_700Bold", marginLeft: 4 }}>
                Menu
              </Text>
            </TouchableOpacity>
            <ScreenHeader title={sections.find(s => s.key === activeSection)?.label.toUpperCase() || "MORE"} subtitle="" />
          </View>
        )}

        {/* ── Menu List ── */}
        {activeSection === "menu" && (
          <View style={{ gap: 8 }}>
            {sections.map((s) => (
              <ListRow
                key={s.key}
                icon={s.icon as any}
                title={s.label}
                onPress={() => setActiveSection(s.key)}
              />
            ))}
          </View>
        )}

        {/* ── Body Stats ── */}
        {activeSection === "body" && (
          <>

            <ListRow
              icon="clipboard"
              title="Import InBody Report"
              subtitle="Paste from Claude or ChatGPT"
              onPress={() => router.push("/modals/inbody-paste")}
            />
          </>
        )}

        {/* ── Supplements ── */}
        {activeSection === "supplements" && (
          <Card>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
              TODAY'S SUPPLEMENTS
            </Text>
            {USER_PROFILE.supplements.length === 0 ? (
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, lineHeight: 18 }}>
                No supplement defaults are configured. The app will not assume a personal supplement stack.
              </Text>
            ) : USER_PROFILE.supplements.map((supp) => {
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
                    borderBottomColor: M3.colors.outline,
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleSupplement(supp.name, taken)}
                    activeOpacity={0.75}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: taken ? M3.colors.successContainer : M3.colors.surfaceVariant,
                      borderWidth: 2,
                      borderColor: taken ? M3.colors.success : M3.colors.outline,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {taken && <Feather name="check" size={20} color={M3.colors.success} />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: taken ? M3.colors.onSurface : M3.colors.onSurfaceVariant, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                      {supp.name}
                    </Text>
                    <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 }}>
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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                RECOVERY LOG
              </Text>
              {recoverySaved && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="check-circle" size={12} color={M3.colors.success} />
                  <Text style={{ color: M3.colors.success, fontSize: 11, fontFamily: "DMSans_400Regular" }}>Saved</Text>
                </View>
              )}
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                Sleep Duration (hours)
              </Text>
              <Input
                value={sleepHr}
                onChangeText={setSleepHr}
                keyboardType="decimal-pad"
                placeholder="7.5"
                style={{
                  backgroundColor: M3.colors.surfaceVariant,
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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                Notes (optional)
              </Text>
              <Input
                value={recoveryNotes}
                onChangeText={setRecoveryNotes}
                placeholder="How are you feeling?"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: M3.colors.surfaceVariant,
                  textAlignVertical: "top",
                  minHeight: 80,
                }}
              />
            </View>

            <Button label="Save Recovery Log" onPress={saveRecovery} />
          </Card>
        )}

        {/* ── Reports ── */}
        {activeSection === "reports" && (
          <>
            <TouchableOpacity
              onPress={() => router.push("/modals/monthly-report")}
              activeOpacity={0.75}
              style={{
                backgroundColor: M3.colors.primaryContainer,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: M3.colors.primary + "44",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Feather name="file-text" size={20} color={M3.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.primary, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  Generate Monthly Report
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  AI-powered analysis of your month
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={M3.colors.primary} />
            </TouchableOpacity>

            {reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                        {report.month}
                      </Text>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                        Generated {new Date(report.generated_at * 1000).toLocaleDateString()}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={M3.colors.onSurfaceMuted} />
                  </View>
                </Card>
              ))
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                  No reports generated yet
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Account ── */}
        {activeSection === "account" && (
          <>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                  SUPABASE ACCOUNT
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: signedInEmail ? M3.colors.successContainer : M3.colors.surfaceVariant,
                    borderRadius: M3.shape.full,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: signedInEmail ? M3.colors.success : M3.colors.onSurfaceMuted }} />
                  <Text style={{ color: signedInEmail ? M3.colors.onSuccessContainer : M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.3 }}>
                    {!authChecked ? "CHECKING…" : signedInEmail ? "CONNECTED" : "NOT CONNECTED"}
                  </Text>
                </View>
              </View>

              {signedInEmail ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>
                    Signed in as {signedInEmail}
                  </Text>
                  <TouchableOpacity onPress={handleSignOut}>
                    <Text style={{ color: M3.colors.error, fontSize: 13, fontFamily: "DMSans_700Bold" }}>Sign out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email" />
                  <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
                  <Button label={isAuthenticating ? "Signing in…" : "Sign in"} onPress={handleSignIn} disabled={!isSupabaseConfigured || isAuthenticating} loading={isAuthenticating} />
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                    You'll stay signed in across app restarts once verified.
                  </Text>
                </View>
              )}
            </Card>

            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>NutriLift Sync</Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 3 }}>
                    {isWeb ? "Sync is available in the Android app" : isSupabaseConfigured ? syncStatus : "Supabase is not configured"}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Sync NutriLift data now"
                  disabled={isWeb || !isSupabaseConfigured || !signedInEmail || isSyncing}
                  onPress={syncNow}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: !isWeb && isSupabaseConfigured && signedInEmail ? M3.colors.primary : M3.colors.surfaceVariant,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: !isWeb && isSupabaseConfigured && signedInEmail ? M3.colors.onPrimary : M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                    {isSyncing ? "Syncing…" : isWeb ? "Android only" : "Sync now"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                {isWeb ? "Web uses a no-op database; use Android for local-first sync." : signedInEmail ? "Sync uploads locally queued changes to your Supabase account." : "Sign in above before syncing."}
              </Text>
            </Card>

            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                  GROQ API KEY
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: groqKeySaved ? M3.colors.successContainer : M3.colors.surfaceVariant,
                    borderRadius: M3.shape.full,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: groqKeySaved ? M3.colors.success : M3.colors.onSurfaceMuted }} />
                  <Text style={{ color: groqKeySaved ? M3.colors.onSuccessContainer : M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.3 }}>
                    {groqKeySaved ? "READY" : "NOT CONFIGURED"}
                  </Text>
                </View>
              </View>

              {groqKeySaved ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>
                    API key is securely stored on this device.
                  </Text>
                  <TouchableOpacity onPress={handleClearGroq}>
                    <Text style={{ color: M3.colors.error, fontSize: 13, fontFamily: "DMSans_700Bold" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Input 
                    value={groqKeyInput} 
                    onChangeText={setGroqKeyInput} 
                    autoCapitalize="none" 
                    autoCorrect={false} 
                    secureTextEntry 
                    placeholder="gsk_..." 
                  />
                  <Button 
                    label={isVerifyingGroq ? "Verifying…" : "Verify & Save"} 
                    onPress={handleVerifyGroq} 
                    disabled={isVerifyingGroq} 
                    loading={isVerifyingGroq} 
                  />
                  <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                    Your key is stored persistently on-device.
                  </Text>
                </View>
              )}
            </Card>
          </>
        )}

        {/* ── Settings ── */}
        {activeSection === "settings" && (
          <>
            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                PROFILE
              </Text>
              {([
                { key: "age", label: "Age", keyboardType: "number-pad" },
                { key: "sex", label: "Sex (male/female/other/prefer_not_to_say)", keyboardType: "default" },
                { key: "height_cm", label: "Height (cm)", keyboardType: "decimal-pad" },
                { key: "training_start_date", label: "Training since (YYYY-MM-DD)", keyboardType: "default" },
                { key: "current_split", label: "Current split", keyboardType: "default" },
                { key: "training_phase", label: "Training phase", keyboardType: "default" },
                { key: "cardio", label: "Cardio routine", keyboardType: "default" },
                { key: "equipment", label: "Available equipment", keyboardType: "default" },
                { key: "physique_goal", label: "Physique / training goal", keyboardType: "default" },
                { key: "body_fat_goal_pct", label: "Body-fat goal (%)", keyboardType: "decimal-pad" },
                { key: "body_fat_goal_date", label: "Body-fat goal date (YYYY-MM-DD)", keyboardType: "default" },
              ] as const).map((item) => (
                <View key={item.key} style={{ gap: 5, paddingVertical: 6 }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Input value={profileInputs[item.key]} onChangeText={(value) => setProfileInputs((current) => ({ ...current, [item.key]: value }))} keyboardType={item.keyboardType as any} placeholder="Leave blank if unknown" />
                </View>
              ))}
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, lineHeight: 16, marginVertical: 8 }}>
                Profile fields are stored on this device. Unknown values stay blank and are not inferred by Coach.
                {persistedProfile ? ` Last saved ${new Date(persistedProfile.updated_at).toLocaleDateString()}.` : ""}
              </Text>
              <Button label={profileSaving ? "Saving profile…" : "Save profile"} loading={profileSaving} disabled={profileSaving} onPress={async () => {
                setProfileSaving(true);
                try {
                  const saved = await updateUserProfile({
                    age: profileInputs.age.trim() ? Number(profileInputs.age) : null,
                    sex: profileInputs.sex.trim() ? profileInputs.sex.trim() as ProfileSex : null,
                    height_cm: profileInputs.height_cm.trim() ? Number(profileInputs.height_cm) : null,
                    training_start_date: profileInputs.training_start_date.trim() || null,
                    current_split: profileInputs.current_split.trim() || null,
                    training_phase: profileInputs.training_phase.trim() || null,
                    cardio: profileInputs.cardio.trim() || null,
                    equipment: profileInputs.equipment.trim() || null,
                    physique_goal: profileInputs.physique_goal.trim() || null,
                    body_fat_goal_pct: profileInputs.body_fat_goal_pct.trim() ? Number(profileInputs.body_fat_goal_pct) : null,
                    body_fat_goal_date: profileInputs.body_fat_goal_date.trim() || null,
                  });
                  setPersistedProfile(saved);
                  Alert.alert("Profile saved", "Coach will use saved values and treat blank fields as unknown.");
                } catch (error) {
                  Alert.alert("Invalid profile", error instanceof Error ? error.message : "Check the profile fields and try again.");
                } finally {
                  setProfileSaving(false);
                }
              }} />
            </Card>

            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                NUTRITION TARGETS
              </Text>
              {([
                { key: "calories", label: "Calories (kcal)", value: targetInputs.calories },
                { key: "protein", label: "Protein (g)", value: targetInputs.protein },
                { key: "carbs", label: "Carbs (g)", value: targetInputs.carbs },
                { key: "fat", label: "Fat (g)", value: targetInputs.fat },
              ] as const).map((item) => (
                <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>
                  <Text style={{ flex: 1, color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Input value={item.value} onChangeText={(value) => setTargetInputs((current) => ({ ...current, [item.key]: value }))} keyboardType="decimal-pad" style={{ width: 100, textAlign: "right" }} />
                </View>
              ))}
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, marginTop: 8, marginBottom: 6 }}>Goal</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                {(["lose", "maintain", "gain"] as const).map((goal) => (
                  <TouchableOpacity key={goal} accessibilityRole="button" accessibilityState={{ selected: nutritionTargets.goal === goal }} onPress={() => setNutritionTargets((current) => ({ ...current, goal }))} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center", backgroundColor: nutritionTargets.goal === goal ? M3.colors.primaryContainer : M3.colors.surfaceVariant }}>
                    <Text style={{ color: nutritionTargets.goal === goal ? M3.colors.onPrimaryContainer : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>{goal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, lineHeight: 16, marginBottom: 10 }}>
                Targets are stored locally. Changes apply from today and previous target history is preserved.
              </Text>
              <Button
                label={suggestionLoading ? "Reviewing history…" : "Review adaptive calorie suggestion"}
                icon="activity"
                variant="secondary"
                loading={suggestionLoading}
                disabled={suggestionLoading || targetsSaving}
                onPress={handleReviewAdaptiveTarget}
                style={{ marginBottom: 10 }}
              />
              <Button
                label={targetsSaving ? "Saving…" : "Save nutrition targets"}
                loading={targetsSaving}
                disabled={targetsSaving}
                onPress={async () => {
                  const targets: NutritionTargets = {
                    calories: Number(targetInputs.calories),
                    protein_g: Number(targetInputs.protein),
                    carbs_g: Number(targetInputs.carbs),
                    fat_g: Number(targetInputs.fat),
                    goal: nutritionTargets.goal,
                    mode: "manual",
                  };
                  setTargetsSaving(true);
                  try {
                    await saveNutritionTargets(targets, { source: "manual", effectiveDate: today });
                    setNutritionTargets(targets);
                    Alert.alert("Targets saved", "Your nutrition targets are saved and effective today.");
                  } catch (error) {
                    Alert.alert("Invalid targets", error instanceof Error ? error.message : "Check the values and try again.");
                  } finally {
                    setTargetsSaving(false);
                  }
                }}
              />
            </Card>

            {USER_PROFILE.structural_notes.length > 0 && (
            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                STRUCTURAL NOTES
              </Text>
              {USER_PROFILE.structural_notes.map((note, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, paddingVertical: 6 }}>
                  <Feather name="alert-circle" size={12} color={M3.colors.warning} style={{ marginTop: 2 }} />
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 18 }}>
                    {note}
                  </Text>
                </View>
              ))}
            </Card>
            )}

            <ListRow
              icon="download"
              title="Export Progress PDF"
              subtitle="All logs & progress data"
              onPress={() => {
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
            />

            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                NutriLift v1.0 · Built for Prithvi · May 2026
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
