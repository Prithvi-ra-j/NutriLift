import "../global.css";
import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Platform, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  BebasNeue_400Regular,
} from "@expo-google-fonts/bebas-neue";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { runMigrations, sqlite } from "../lib/db/client";
import { ensureDerivedDataForV5 } from "../lib/db/queries/rebuild";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { logger } from "../lib/logger";
import { M3 } from "../design-system/tokens";
import { MigrationFailureScreen } from "../components/MigrationFailureScreen";
import { requestSync, startSyncTriggers } from "../lib/sync/syncEngine";
import { purgeUploadedDeletedRows } from "../lib/db/purge";
import { purgeUploadedQueue } from "../lib/integrations/life-os/syncRepository";
import { onBackground, onForeground } from "../lib/lifecycle/foreground";
import { supabase } from "../lib/supabase/client";
import { hasCloudBackup, hasEmptyLocalDatabase, markRestorePrompted, restoreFromCloud } from "../lib/sync/restore";
import { getProfile } from "../lib/data/profile";

type GlobalErrorUtils = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let globalErrorHandlerInstalled = false;

function installGlobalErrorHandler(): void {
  if (globalErrorHandlerInstalled) return;
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!errorUtils) return;

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logger.error("Unhandled JavaScript error", {
      message: error.message,
      stack: error.stack,
      isFatal: Boolean(isFatal),
    });
    previousHandler(error, isFatal);
  });
  globalErrorHandlerInstalled = true;
}

export default function RootLayout() {
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [migrationAttempt, setMigrationAttempt] = useState(0);
  const [restoreCheckComplete, setRestoreCheckComplete] = useState(false);
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);
  const restorePromptStarted = useRef(false);
  const profileSetupPrompted = useRef(false);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    installGlobalErrorHandler();
  }, []);

  useEffect(() => {
    if (!dbReady || Platform.OS === "web") return;
    supabase?.auth.startAutoRefresh();
    const unsubscribeSync = startSyncTriggers();
    const unsubscribeForeground = onForeground(() => supabase?.auth.startAutoRefresh());
    const unsubscribeBackground = onBackground(() => supabase?.auth.stopAutoRefresh());
    return () => {
      unsubscribeSync();
      unsubscribeForeground();
      unsubscribeBackground();
      supabase?.auth.stopAutoRefresh();
    };
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    if (Platform.OS === "web" || !supabase || restorePromptStarted.current) {
      setRestoreCheckComplete(true);
      return;
    }
    restorePromptStarted.current = true;
    void (async () => {
      const prompted = await sqlite.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'restore_prompted'",
      );
      if (prompted?.value === "1") {
        setRestoreCheckComplete(true);
        return;
      }
      if (!(await hasEmptyLocalDatabase()) || !(await hasCloudBackup())) {
        setRestoreCheckComplete(true);
        return;
      }
      Alert.alert(
        "Cloud backup found",
        "This device has no NutriLift logs. Would you like to restore your backup now?",
        [
          {
            text: "Not now",
            style: "cancel",
            onPress: () => {
              void markRestorePrompted().catch((error: unknown) => {
                logger.error("Could not save the restore prompt choice", { error });
              }).finally(() => {
                setRestoreCheckComplete(true);
              });
            },
          },
          {
            text: "Restore",
            onPress: () => {
              void markRestorePrompted()
                .then(() => restoreFromCloud())
                .then((count) => Alert.alert("Restore complete", `Restored ${count} records.`))
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : String(error);
                  logger.error("First-run cloud restore failed", { error: message });
                  Alert.alert("Restore failed", message);
                })
                .finally(() => {
                  setRestoreCheckComplete(true);
                });
            },
          },
        ],
        { cancelable: false },
      );
    })().catch((error: unknown) => {
      logger.warn("Could not check for a first-run cloud backup", {
        error: error instanceof Error ? error.message : String(error),
      });
      setRestoreCheckComplete(true);
    });
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady || !restoreCheckComplete) return;
    let active = true;
    getProfile()
      .then((profile) => {
        if (active) setProfileSetupRequired(!profile);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Profile setup status check failed", { error: message });
        setDbError(message);
      });
    return () => {
      active = false;
    };
  }, [dbReady, restoreCheckComplete]);

  useEffect(() => {
    if (!dbReady || !restoreCheckComplete || !profileSetupRequired || profileSetupPrompted.current) return;
    profileSetupPrompted.current = true;
    router.replace({ pathname: "/modals/profile-setup", params: { firstRun: "true" } });
  }, [dbReady, profileSetupRequired, restoreCheckComplete, router]);

  useEffect(() => {
    let active = true;
    logger.info("App starting - initializing database");
    runMigrations()
      .then(() => ensureDerivedDataForV5())
      .then(() => {
        return purgeUploadedDeletedRows();
      })
      .then(() => purgeUploadedQueue())
      .then(() => {
        if (!active) return;
        logger.info("Database migrations completed successfully");
        setDbReady(true);
        if (Platform.OS !== "web") void requestSync("app-start");
      })
      .catch((err) => {
        if (!active) return;
        logger.error("DB migration failed", {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        setDbError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [migrationAttempt]);

  if (dbError) {
    return (
      <MigrationFailureScreen
        message={dbError}
        onRetry={() => {
          setDbError(null);
          setDbReady(false);
          setMigrationAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: M3.colors.background }}>
        <ActivityIndicator color={M3.colors.primary} size="large" />
        <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", marginTop: 12, fontSize: 14 }}>
          Initializing NutriLift...
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modals/profile-setup"
            options={{
              presentation: "modal",
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="modals/log-food"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/log-exercise"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/inbody-paste"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/monthly-report"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/voice-input"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/barcode-scanner"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="modals/nutrition-card"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals/view-logs"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
