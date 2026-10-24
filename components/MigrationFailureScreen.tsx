import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { sqlite } from "../lib/db/client";
import { exportDatabaseBackup, isDatabaseBackupExportable } from "../lib/data/exportAll";
import { logger } from "../lib/logger";
import { M3 } from "../design-system/tokens";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: M3.colors.background,
  },
  title: {
    color: M3.colors.error,
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  body: {
    color: M3.colors.onSurfaceVariant,
    fontFamily: "DMSans_400Regular",
    marginTop: 12,
    textAlign: "center",
  },
  detail: {
    color: M3.colors.onSurfaceMuted,
    fontFamily: "DMSans_400Regular",
    marginTop: 12,
    textAlign: "center",
  },
  button: {
    alignSelf: "center",
    padding: 12,
  },
  firstButton: {
    alignSelf: "center",
    marginTop: 16,
    padding: 12,
  },
  buttonText: {
    color: M3.colors.primary,
    fontFamily: "DMSans_700Bold",
  },
  status: {
    color: M3.colors.onSurfaceVariant,
    fontFamily: "DMSans_400Regular",
    marginTop: 8,
    textAlign: "center",
  },
});

type MigrationFailureScreenProps = {
  message: string;
  onRetry: () => void;
};

export function MigrationFailureScreen({
  message,
  onRetry,
}: MigrationFailureScreenProps) {
  const [databaseVersion, setDatabaseVersion] = useState<string>("Checking...");
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? "Unavailable";

  useEffect(() => {
    let active = true;

    sqlite
      .getFirstAsync<{ user_version: number }>("PRAGMA user_version")
      .then(async (result) => {
        if (!active) return;
        setDatabaseVersion(String(result?.user_version ?? "Unavailable"));
        const quickCheck = await sqlite.getFirstAsync<{ quick_check: string }>(
          "PRAGMA quick_check",
        );
        if (quickCheck?.quick_check !== "ok") return;
        const exportable = await isDatabaseBackupExportable();
        if (active) setBackupAvailable(exportable);
      })
      .catch((error: unknown) => {
        logger.warn("Could not read migration diagnostics", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (active) setDatabaseVersion("Unavailable");
      });

    return () => {
      active = false;
    };
  }, []);

  const copyDiagnostics = async () => {
    try {
      await Clipboard.setStringAsync(
        [
          "NutriLift database migration failure",
          `App version: ${appVersion}`,
          `SQLite user_version: ${databaseVersion}`,
          `Error: ${message}`,
        ].join("\n"),
      );
      setActionMessage("Diagnostics copied.");
    } catch (error) {
      logger.error("Could not copy migration diagnostics", {
        error: error instanceof Error ? error.message : String(error),
      });
      setActionMessage("Could not copy diagnostics. Please share the error text above.");
    }
  };

  const exportBackup = async () => {
    setBusy(true);
    setActionMessage(null);
    try {
      await exportDatabaseBackup();
      setActionMessage("Backup shared.");
    } catch (error) {
      logger.error("Migration-failure data export failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      setActionMessage(
        `Data export is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        NutriLift could not safely open your data
      </Text>
      <Text style={styles.body}>
        Your database migration did not complete. Your data has not been opened.
        Retry or update the app. If available, export a backup before troubleshooting.
      </Text>
      <Text accessibilityRole="text" selectable style={styles.detail}>
        {message}
      </Text>
      <Text accessibilityRole="text" style={styles.detail}>
        App version: {appVersion}{"\n"}SQLite user_version: {databaseVersion}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.firstButton}
      >
        <Text style={styles.buttonText}>Retry database setup</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => void copyDiagnostics()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Copy diagnostics</Text>
      </Pressable>
      {backupAvailable ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void exportBackup()}
          style={styles.button}
        >
          {busy ? (
            <ActivityIndicator color={M3.colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Export database backup</Text>
          )}
        </Pressable>
      ) : null}
      {actionMessage ? (
        <Text accessibilityRole="text" style={styles.status}>
          {actionMessage}
        </Text>
      ) : null}
    </View>
  );
}
