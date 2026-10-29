import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import uuid from "react-native-uuid";
import { insertBodyStat, getLatestWeight, getSupplementLogsForDate, upsertSupplementLog, getRecoveryLog, upsertRecoveryLog, getAllReports, rebuildAllDerived } from "../../lib/data";
import { isSupabaseConfigured, supabase } from "../../lib/supabase/client";
import { getCurrentSession, signInWithEmail, signOut } from "../../lib/supabase/auth";
import { requestSync, retryRejectedAndSync, useSyncStatus } from "../../lib/sync/syncEngine";
import { hasCloudBackup, hasEmptyLocalDatabase, restoreFromCloud } from "../../lib/sync/restore";
import { logger } from "../../lib/logger";
import { useToday } from "../../lib/time/useToday";
import { getProfile, getTargetsForDate } from "../../lib/data/profile";
import { exportDatabaseBackup, exportSanitizedMigrationFixture } from "../../lib/data/exportAll";
import { getAiContextPreferences, getMinimumCalorieFloor, setAiContextPreference, setMinimumCalorieFloor as setMinimumCalorieFloorPreference } from "../../lib/ai/preferences";
import { getAiPreference } from "../../lib/data/aiPreferences";
import { getTrackingPauseStatus, pauseTracking, resumeTracking } from "../../lib/pauseMode";
import { addDays } from "../../lib/time/localDate";
import { useToast } from "../ui/Toast";
import { useMoreUiReducer, type MoreSection, type MoreSectionIcon } from "./moreUiReducer";

const VALID_SECTIONS: MoreSection[] = ["menu", "body", "supplements", "recovery", "reports", "account", "settings"];

export function useMoreScreenController() {

  const today = useToday();
  const { show: showToast } = useToast();
  const { state: ui, setField: setUi } = useMoreUiReducer();
  const params = useLocalSearchParams<{ section?: string }>();
  const syncSnapshot = useSyncStatus();
  const isWeb = Platform.OS === "web";

  const loadData = useCallback(async () => {
    const [
      weight,
      suppLogs,
      recoveryLog,
      reportsData,
      profileData,
      targetData,
      aiPreferences,
      calorieFloor,
      consent,
      pauseStatus,
    ] = await Promise.all([
      getLatestWeight(),
      getSupplementLogsForDate(today),
      getRecoveryLog(today),
      getAllReports(),
      getProfile(),
      getTargetsForDate(today),
      getAiContextPreferences(),
      getMinimumCalorieFloor(),
      getAiPreference("ai_consent_v1"),
      getTrackingPauseStatus(today),
    ]);

    setUi("latestWeight", weight?.weight_kg ?? null);
    setUi("supplementLogs", suppLogs);
    setUi("reports", reportsData);
    setUi("profile", profileData);
    setUi("targets", targetData);
    setUi("includeBodyMeasurements", aiPreferences.includeBodyMeasurements);
    setUi("includeInjuriesAndNotes", aiPreferences.includeInjuriesAndNotes);
    setUi("minimumCalorieFloor", String(calorieFloor));
    setUi("aiConsent", consent === "accepted");
    setUi("trackingPause", pauseStatus);

    if (recoveryLog) {
      setUi("sleepHr", recoveryLog.sleep_duration_hr?.toString() ?? "7");
      setUi("sleepQuality", recoveryLog.sleep_quality ?? 3);
      setUi("energyLevel", recoveryLog.energy_level ?? 3);
      setUi("soreness", recoveryLog.muscle_soreness ?? 3);
      setUi("stressLevel", recoveryLog.stress_level ?? 3);
      setUi("recoveryNotes", recoveryLog.notes ?? "");
      setUi("recoverySaved", true);
    }
  }, [today]);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadData()
      .then(() => {
        if (active) setUi("loadError", null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.error("More screen data load failed", { error: message });
        setUi("loadError", message);
      });
    return () => {
      active = false;
    };
  }, [loadData]));

  useEffect(() => {
    // Reads the locally persisted session (no network call) so sign-in survives app restarts / pull-to-refresh.
    getCurrentSession()
      .then(({ data }) => {
        setUi("signedInEmail", data.session?.user.email ?? null);
        setUi("authChecked", true);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Stored Supabase session lookup failed", { error: message });
        setUi("authError", message);
        setUi("authChecked", true);
      });
  }, []);

  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setUi("signedInEmail", null);
      else if (session?.user.email) setUi("signedInEmail", session.user.email);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ui.signedInEmail || isWeb || !isSupabaseConfigured) {
      setUi("restoreAvailability", "unavailable");
      return;
    }

    let active = true;
    setUi("restoreAvailability", "checking");
    setUi("restoreAvailabilityError", null);
    Promise.all([hasEmptyLocalDatabase(), hasCloudBackup()])
      .then(([localDatabaseIsEmpty, cloudBackupExists]) => {
        if (!active) return;
        if (!localDatabaseIsEmpty) setUi("restoreAvailability", "local-data");
        else if (!cloudBackupExists) setUi("restoreAvailability", "no-backup");
        else setUi("restoreAvailability", "available");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Could not check cloud restore availability", { error: message });
        setUi("restoreAvailabilityError", message);
        setUi("restoreAvailability", "error");
      });
    return () => {
      active = false;
    };
  }, [isWeb, ui.signedInEmail]);

  useEffect(() => {
    if (params.section && VALID_SECTIONS.includes(params.section as MoreSection)) {
      setUi("activeSection", params.section as MoreSection);
    }
  }, [params.section]);

  const logWeight = async () => {
    const weight = parseFloat(ui.weightInput);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      showToast({ message: "Enter a valid weight in kg.", kind: "error" });
      return;
    }
    try {
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
      setUi("latestWeight", weight);
      setUi("weightInput", "");
      showToast({ message: `Weight ${weight}kg saved.`, kind: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Weight log failed", { error: message });
      showToast({ message: "Could not save this weight.", kind: "error" });
    }
  };

  const toggleSupplement = async (supplementName: string, currentTaken: boolean) => {
    try {
      await upsertSupplementLog(today, supplementName, !currentTaken);
      const updated = await getSupplementLogsForDate(today);
      setUi("supplementLogs", updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Supplement log update failed", { error: message });
      showToast({ message: "Could not update this supplement.", kind: "error" });
    }
  };

  const toggleTrackingPause = async () => {
    try {
      if (ui.trackingPause.paused) {
        await resumeTracking(today);
      } else {
        await pauseTracking(today, addDays(today, 6));
      }
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Tracking pause update failed", { error: message });
      showToast({ message: "Could not update the tracking pause.", kind: "error" });
    }
  };

  const saveRecovery = async () => {
    try {
      await upsertRecoveryLog({
        date: today,
        sleep_duration_hr: parseFloat(ui.sleepHr) || null,
        sleep_quality: ui.sleepQuality,
        bedtime: null,
        wake_time: null,
        hrv: null,
        resting_hr: null,
        energy_level: ui.energyLevel,
        muscle_soreness: ui.soreness,
        stress_level: ui.stressLevel,
        notes: ui.recoveryNotes || null,
      });
      setUi("recoverySaved", true);
      showToast({ message: "Recovery log saved.", kind: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Recovery log save failed", { error: message });
      showToast({ message: "Could not save the recovery log.", kind: "error" });
    }
  };

  const syncNow = async () => {
    setUi("isSyncing", true);
    try {
      const result = await requestSync("settings-manual");
      if (result.error) {
        setUi("syncStatus", result.error);
        showToast({ message: result.error, kind: "error" });
        return;
      }
      setUi("syncStatus", `Uploaded ${result.uploaded}, skipped ${result.skipped}`);
      showToast({
        message: `Uploaded ${result.uploaded} record${result.uploaded === 1 ? "" : "s"}.`,
        kind: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setUi("syncStatus", message);
      logger.error("Manual sync failed", { error: message });
      showToast({ message: "Sync unavailable. Check your connection and try again.", kind: "error" });
    } finally {
      setUi("isSyncing", false);
    }
  };

  const retryRejected = async () => {
    setUi("isSyncing", true);
    try {
      const result = await retryRejectedAndSync();
      if (result.error) throw new Error(result.error);
      showToast({
        message: `Uploaded ${result.uploaded} record${result.uploaded === 1 ? "" : "s"}.`,
        kind: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Rejected sync retry failed", { error: message });
      showToast({ message: "Sync retry failed. Please try again.", kind: "error" });
    } finally {
      setUi("isSyncing", false);
    }
  };

  const restoreCloudBackup = async () => {
    setUi("isSyncing", true);
    try {
      const count = await restoreFromCloud();
      setUi("syncStatus", `Restored ${count} records`);
      setUi("restoreAvailability", "local-data");
      await loadData();
      showToast({
        message: `Restored ${count} records from your cloud backup.`,
        kind: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Cloud backup restore failed", { error: message });
      showToast({ message: "Restore failed. Please try again.", kind: "error" });
    } finally {
      setUi("isSyncing", false);
    }
  };

  const handleSignIn = async () => {
    if (!ui.email.trim() || !ui.password) {
      showToast({ message: "Enter your Supabase email and password.", kind: "error" });
      return;
    }

    setUi("isAuthenticating", true);
    try {
      const { data, error } = await signInWithEmail(ui.email.trim(), ui.password);
      if (error) {
        showToast({ message: error.message || "Could not start a Supabase session.", kind: "error" });
        return;
      }
      if (!data?.user) {
        showToast({ message: "Could not start a Supabase session.", kind: "error" });
        return;
      }

      setUi("password", "");
      setUi("signedInEmail", data.user.email ?? ui.email.trim());
      setUi("syncStatus", "Ready to sync");
      showToast({ message: "Signed in successfully.", kind: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Supabase sign-in failed", { error: message });
      showToast({ message: "Sign-in failed. Please try again.", kind: "error" });
    } finally {
      setUi("isAuthenticating", false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;

      setUi("signedInEmail", null);
      setUi("syncStatus", "Sign in before syncing");
      showToast({ message: "Signed out.", kind: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Supabase sign-out failed", { error: message });
      showToast({ message: "Sign-out failed. Please try again.", kind: "error" });
    }
  };

  const sections: { key: MoreSection; label: string; icon: MoreSectionIcon }[] = [
    { key: "body", label: "Body", icon: "user" },
    { key: "supplements", label: "Supps", icon: "package" },
    { key: "recovery", label: "Recovery", icon: "moon" },
    { key: "reports", label: "Reports", icon: "file-text" },
    { key: "account", label: "Account", icon: "cloud" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];


  return {
    ui,
    setUi,
    isWeb,
    syncSnapshot,
    sections,
    loadData,
    logWeight,
    toggleSupplement,
    saveRecovery,
    toggleTrackingPause,
    syncNow,
    retryRejected,
    restoreCloudBackup,
    handleSignIn,
    handleSignOut,
    showToast,
  };
}
