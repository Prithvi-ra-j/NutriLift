import "../global.css";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
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
import { runMigrations } from "../lib/db/client";
import { processDerivedStateInvalidations } from "../lib/db/queries/derived-state-consumer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { logger } from "../lib/logger";
import { M3 } from "../design-system/tokens";
import { processSyncQueue } from "../lib/integrations/life-os/syncClient";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [migrationAttempt, setMigrationAttempt] = useState(0);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    logger.info("App starting - initializing database");
    runMigrations()
      .then(async () => {
        logger.info("Database migrations completed successfully");
        try { await processDerivedStateInvalidations(); }
        catch (error) { logger.warn("Derived-state invalidation processing failed", { error: error instanceof Error ? error.message : "unknown" }); }
        setDbReady(true);
        if (Platform.OS === "web") return;

        processSyncQueue().then((result) => {
          if (result.error && result.error !== "Supabase is not configured." && result.error !== "Sign in before syncing NutriLift.") {
            logger.warn("NutriLift sync did not complete", { error: result.error });
          }
        }).catch((error) => {
          logger.warn("NutriLift sync failed", { error: error.message });
        });
      })
      .catch((err) => {
        logger.error("DB migration failed", {
          error: err.message,
          stack: err.stack,
        });
        console.error("DB migration failed:", err);
        setDbError(err.message);
        setDbReady(true); // Still proceed, show error in UI
      });
  }, [migrationAttempt]);

  if (dbError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: M3.colors.background, gap: 14 }}>
        <Text style={{ color: M3.colors.error, fontFamily: "DMSans_700Bold", fontSize: 20, textAlign: "center" }}>
          NutriLift could not initialize its local database
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center" }}>
          Your existing local data has not been intentionally deleted. The app has stopped before opening screens that depend on the database.
        </Text>
        <Text selectable style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, textAlign: "center" }}>
          {dbError}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry database initialization"
          onPress={() => {
            setDbReady(false);
            setDbError(null);
            setMigrationAttempt((attempt) => attempt + 1);
          }}
          style={{ backgroundColor: M3.colors.primary, borderRadius: M3.shape.full, paddingHorizontal: 22, paddingVertical: 12, marginTop: 4 }}
        >
          <Text style={{ color: M3.colors.onPrimary, fontFamily: "DMSans_700Bold" }}>Retry initialization</Text>
        </TouchableOpacity>
      </View>
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" backgroundColor={M3.colors.background} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
