import "../global.css";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { logger } from "../lib/logger";
import { M3 } from "../design-system/tokens";
import { syncToSupabase } from "../lib/integrations/life-os/syncClient";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    logger.info("App starting - initializing database");
    runMigrations()
      .then(() => {
        logger.info("Database migrations completed successfully");
        setDbReady(true);
        if (Platform.OS === "web") return;

        syncToSupabase().then((result) => {
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
  }, []);

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
