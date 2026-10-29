import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { M3 } from "../../design-system/tokens";
import { logger } from "../../lib/logger";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { rebuildAllDerived } from "../../lib/data";
import {
  exportDatabaseBackup,
  exportSanitizedMigrationFixture,
} from "../../lib/data/exportAll";
import {
  getMinimumCalorieFloor,
  setAiContextPreference,
  setMinimumCalorieFloor as setMinimumCalorieFloorPreference,
} from "../../lib/ai/preferences";
import { useMoreScreenController } from "./useMoreScreenController";
import { MoreNavigation } from "./MoreNavigation";
import { BodySection } from "./BodySection";
import { SupplementSection } from "./SupplementSection";
import { RecoverySection } from "./RecoverySection";
import { ReportsSection } from "./ReportsSection";
import { AccountSection } from "./AccountSection";
import { SyncSection } from "./SyncSection";
import { AiSection } from "./AiSection";
import { DataSection } from "./DataSection";
import { ProfileSection, ProfileSetupRow } from "./ProfileSection";
import { TrackingPauseSection } from "./TrackingPauseSection";
import { ScreenLoadErrorBanner } from "./ScreenLoadErrorBanner";

export default function MoreScreen() {
  const {
    ui, setUi, isWeb, syncSnapshot, sections, loadData,
    logWeight, toggleSupplement, saveRecovery, toggleTrackingPause,
    syncNow, retryRejected, restoreCloudBackup, handleSignIn,
    handleSignOut, showToast,
  } = useMoreScreenController();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {ui.loadError ? (
          <ScreenLoadErrorBanner
            message={ui.loadError}
            onRetry={() => {
              loadData()
                .then(() => setUi("loadError", null))
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : String(error);
                  logger.error("More screen data retry failed", { error: message });
                  setUi("loadError", message);
                });
            }}
          />
        ) : null}
        <MoreNavigation
          activeSection={ui.activeSection}
          sections={sections}
          onNavigate={(section) => setUi("activeSection", section)}
        />

        {/* ── Body Stats ── */}
        {ui.activeSection === "body" && <BodySection />}

        {ui.activeSection === "supplements" && (
          <SupplementSection logs={ui.supplementLogs} onToggle={(name, taken) => void toggleSupplement(name, taken)} />
        )}

        {ui.activeSection === "recovery" && (
          <RecoverySection
            energyLevel={ui.energyLevel}
            notes={ui.recoveryNotes}
            onEnergyChange={(value) => setUi("energyLevel", value)}
            onNotesChange={(value) => setUi("recoveryNotes", value)}
            onSave={() => void saveRecovery()}
            onSleepChange={(value) => setUi("sleepHr", value)}
            onSleepQualityChange={(value) => setUi("sleepQuality", value)}
            onSorenessChange={(value) => setUi("soreness", value)}
            onStressChange={(value) => setUi("stressLevel", value)}
            saved={ui.recoverySaved}
            sleepDuration={ui.sleepHr}
            sleepQuality={ui.sleepQuality}
            soreness={ui.soreness}
            stressLevel={ui.stressLevel}
          />
        )}

        {ui.activeSection === "reports" && <ReportsSection reports={ui.reports} />}

        {ui.activeSection === "account" && (
          <>
            <AccountSection
              authChecked={ui.authChecked}
              authError={ui.authError}
              email={ui.email}
              isAuthenticating={ui.isAuthenticating}
              isConfigured={isSupabaseConfigured}
              onEmailChange={(value) => setUi("email", value)}
              onPasswordChange={(value) => setUi("password", value)}
              onSignIn={() => void handleSignIn()}
              onSignOut={() => void handleSignOut()}
              password={ui.password}
              signedInEmail={ui.signedInEmail}
            />
            <SyncSection
              isConfigured={isSupabaseConfigured}
              isSyncing={ui.isSyncing}
              isWeb={isWeb}
              onRestore={() => void restoreCloudBackup()}
              onRetry={() => void retryRejected()}
              onSync={() => void syncNow()}
              restoreAvailability={ui.restoreAvailability}
              restoreAvailabilityError={ui.restoreAvailabilityError}
              signedInEmail={ui.signedInEmail}
              statusMessage={ui.syncStatus}
              syncSnapshot={syncSnapshot}
            />
          </>
        )}

        {ui.activeSection === "settings" && (
          <>
            <TrackingPauseSection
              onToggle={() => void toggleTrackingPause()}
              trackingPause={ui.trackingPause}
            />
            <ProfileSetupRow profile={ui.profile} />
            <AiSection
              aiConsent={ui.aiConsent}
              includeBodyMeasurements={ui.includeBodyMeasurements}
              includeInjuriesAndNotes={ui.includeInjuriesAndNotes}
              minimumCalorieFloor={ui.minimumCalorieFloor}
              onBodyMeasurementsChange={async (enabled) => {
                try {
                  await setAiContextPreference("ai_include_body_measurements", enabled);
                  setUi("includeBodyMeasurements", enabled);
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "Could not save this preference.",
                    kind: "error",
                  });
                }
              }}
              onInjuriesAndNotesChange={async (enabled) => {
                try {
                  await setAiContextPreference("ai_include_injuries_notes", enabled);
                  setUi("includeInjuriesAndNotes", enabled);
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "Could not save this preference.",
                    kind: "error",
                  });
                }
              }}
              onMinimumCalorieFloorChange={(value) => setUi("minimumCalorieFloor", value)}
              onSaveMinimumCalorieFloor={async () => {
                const floor = Number(ui.minimumCalorieFloor);
                try {
                  await setMinimumCalorieFloorPreference(floor);
                  setUi("minimumCalorieFloor", String(floor));
                } catch (error) {
                  setUi("minimumCalorieFloor", String(await getMinimumCalorieFloor()));
                  showToast({
                    message: error instanceof Error ? error.message : "The calorie floor could not be saved.",
                    kind: "error",
                  });
                }
              }}
            />
            <ProfileSection profile={ui.profile} targets={ui.targets} />
            <DataSection
              isExportingFixture={ui.isExportingFixture}
              isWeb={isWeb}
              onRepair={async () => {
                try {
                  await rebuildAllDerived();
                  await loadData();
                  showToast({
                    message: "Derived data was rebuilt successfully.",
                    kind: "success",
                  });
                } catch (error) {
                  logger.error("Derived data repair failed", {
                    error: error instanceof Error ? error.message : String(error),
                  });
                  showToast({
                    message: error instanceof Error ? error.message : "Could not rebuild derived data.",
                    kind: "error",
                  });
                }
              }}
              onExportData={async () => {
                try {
                  await exportDatabaseBackup();
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "The local data export could not be completed.",
                    kind: "error",
                  });
                }
              }}
              onExportFixture={async () => {
                setUi("isExportingFixture", true);
                try {
                  await exportSanitizedMigrationFixture();
                } catch (error) {
                  showToast({
                    message: error instanceof Error
                      ? error.message
                      : "The sanitized fixture could not be created.",
                    kind: "error",
                  });
                } finally {
                  setUi("isExportingFixture", false);
                }
              }}
              onShareLogs={async () => {
                try {
                  const files = await logger.getAllLogFiles();
                  const latestFile = [...files].sort().pop();
                  if (!latestFile) throw new Error("No local log files are available to share.");
                  if (!(await Sharing.isAvailableAsync())) {
                    throw new Error("Log sharing is unavailable on this device.");
                  }
                  await Sharing.shareAsync(latestFile, {
                    mimeType: "text/plain",
                    dialogTitle: "Share latest application log",
                  });
                } catch (error) {
                  logger.error("Log sharing failed", {
                    error: error instanceof Error ? error.message : String(error),
                  });
                  showToast({
                    message: error instanceof Error ? error.message : "Could not share logs.",
                    kind: "error",
                  });
                }
              }}
              onExportPdf={async (period) => {
                try {
                  const exports = await import("../../lib/export/generate-progress-pdf");
                  const result = period === "last30Days"
                    ? await exports.exportLast30Days()
                    : period === "currentMonth"
                      ? await exports.exportCurrentMonth()
                      : await exports.exportAllData();
                  if (!result.success) {
                    throw new Error(result.error || "Failed to export the progress PDF.");
                  }
                  showToast({
                    message: "Progress PDF exported and ready to share.",
                    kind: "success",
                  });
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "Failed to export the progress PDF.",
                    kind: "error",
                  });
                }
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
