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
import type { SupplementLog, MonthlyReport } from "../../lib/db/schema";
import uuid from "react-native-uuid";
import { syncToSupabase } from "../../lib/integrations/life-os/syncClient";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { getCurrentSession, signInWithEmail, signOut } from "../../lib/supabase/auth";
import { M3 } from "../../design-system/tokens";

type MoreSection = "body" | "supplements" | "recovery" | "reports" | "account" | "settings";
const VALID_SECTIONS: MoreSection[] = ["body", "supplements", "recovery", "reports", "account", "settings"];

export default function MoreScreen() {
  const today = new Date().toISOString().split("T")[0];
  const params = useLocalSearchParams<{ section?: string }>();
  const [activeSection, setActiveSection] = useState<MoreSection>("body");
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isWeb = Platform.OS === "web";

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
account", label: "Account", icon: "cloud" },
    { key: "
    setSignedInEmail(null);
    setSyncStatus("Sign in before syncing");
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
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{label}</Text>
        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{value} / 5</Text>
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
              backgroundColor: value >= v ? M3.colors.primary + "22" : M3.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: value >= v ? M3.colors.primary : M3.colors.outline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: value >= v ? M3.colors.primary : M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
        <ScreenHeader title="MORE" subtitle="Body, recovery, reports & settings" />

        {/* ── Section Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {sections.map((s) => {
              const isActive = activeSection === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setActiveSection(s.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: M3.shape.large,
                    backgroundColor: isActive ? M3.colors.primary : M3.colors.surface,
                    borderWidth: 1,
                    borderColor: isActive ? M3.colors.primary : M3.colors.outline,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    shadowColor: isActive ? M3.colors.primary : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.3 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 3 : 0,
                  }}
                >
                  <Feather name={s.icon} size={14} color={isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant} />
                  <Text style={{ color: isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: isActive ? "DMSans_700Bold" : "DMSans_500Medium" }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Body Stats ── */}
        {activeSection === "body" && (
          <>
            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                DAILY WEIGHT
              </Text>
              {latestWeight && (
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 10 }}>
                  Last logged: <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold" }}>{latestWeight}kg</Text>
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
                    backgroundColor: M3.colors.surfaceVariant,
                    fontSize: 16,
                    fontFamily: "BebasNeue_400Regular",
                  }}
                />
                <TouchableOpacity
                  onPress={logWeight}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: M3.colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: M3.colors.onPrimary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    Log
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            <TouchableOpacity
              onPress={() => router.push("/modals/inbody-paste")}
              activeOpacity={0.75}
              style={{
                backgroundColor: M3.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: M3.colors.outline,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="clipboard" size={18} color={M3.colors.primary} />
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    Import InBody Report
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    Paste from Claude or ChatGPT
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* ── Supplements ── */}
        {activeSection === "supplements" && (
          <Card>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
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

            <TouchableOpacity
              onPress={saveRecovery}
              activeOpacity={0.75}
              style={{
                backgroundColor: M3.colors.primary,
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: M3.colors.onPrimary, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
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
                  <TouchableOpacity
                    onPress={handleSignIn}
                    disabled={!isSupabaseConfigured || isAuthenticating}
                    activeOpacity={0.75}
                    style={{ backgroundColor: isSupabaseConfigured ? M3.colors.primary : M3.colors.surfaceVariant, borderRadius: 8, paddingVertical: 10, alignItems: "center" }}
                  >
                    <Text style={{ color: isSupabaseConfigured ? M3.colors.onPrimary : M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      {isAuthenticating ? "Signing in…" : "Sign in"}
                    </Text>
                  </TouchableOpacity>
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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 6, letterSpacing: 0.5 }}>
                AI GATEWAY
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                {isSupabaseConfigured ? "Authenticated AI gateway available" : "Configure Supabase to enable AI"}
              </Text>
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
              {[
                { label: "Name", value: USER_PROFILE.name },
                { label: "Age", value: `${USER_PROFILE.age}` },
                { label: "Height", value: `${USER_PROFILE.height_cm}cm` },
                { label: "Training Since", value: USER_PROFILE.training_start_date },
                { label: "Current Split", value: USER_PROFILE.training.current_split },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>{item.value}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
                TARGETS
              </Text>
              {[
                { label: "Calories", value: `${USER_PROFILE.targets.calories} kcal` },
                { label: "Protein", value: `${USER_PROFILE.targets.protein_g}g` },
                { label: "Carbs", value: `${USER_PROFILE.targets.carbs_g}g` },
                { label: "Fat", value: `${USER_PROFILE.targets.fat_g}g` },
                { label: "BF% Goal (Dec 2026)", value: `${USER_PROFILE.targets.body_fat_pct_dec2026}%` },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
                  <Text style={{ color: M3.colors.primary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{item.value}</Text>
                </View>
              ))}
            </Card>

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
              activeOpacity={0.75}
              style={{
                backgroundColor: M3.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: M3.colors.outline,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="download" size={18} color={M3.colors.primary} />
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                    Export Progress PDF
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    All logs & progress data
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceMuted} />
            </TouchableOpacity>

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
