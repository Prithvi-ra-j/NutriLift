import { Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";
import { useSyncStatus } from "../../lib/sync/syncEngine";
import type { RestoreAvailability } from "./types";

interface SyncSectionProps {
  isConfigured: boolean;
  isSyncing: boolean;
  isWeb: boolean;
  onRestore: () => void;
  onRetry: () => void;
  onSync: () => void;
  restoreAvailability: RestoreAvailability;
  restoreAvailabilityError: string | null;
  signedInEmail: string | null;
  statusMessage: string;
  syncSnapshot: ReturnType<typeof useSyncStatus>;
}

export function SyncSection({
  isConfigured,
  isSyncing,
  isWeb,
  onRestore,
  onRetry,
  onSync,
  restoreAvailability,
  restoreAvailabilityError,
  signedInEmail,
  statusMessage,
  syncSnapshot,
}: SyncSectionProps) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>NutriLift Sync</Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 3 }}>
            {isWeb ? "Sync is available in the Android app" : isConfigured ? syncSnapshot.lastError ?? statusMessage : "Supabase is not configured"}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Sync NutriLift data now"
          disabled={isWeb || !isConfigured || isSyncing || syncSnapshot.status === "syncing"}
          onPress={onSync}
          activeOpacity={0.75}
          style={{
            backgroundColor: !isWeb && isConfigured ? M3.colors.primary : M3.colors.surfaceVariant,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: !isWeb && isConfigured ? M3.colors.onPrimary : M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
            {isSyncing || syncSnapshot.status === "syncing" ? "Syncing…" : isWeb ? "Android only" : "Sync now"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
        {`Status: ${syncSnapshot.status} · Pending: ${syncSnapshot.pending} · Rejected/dead: ${syncSnapshot.rejected}`}
      </Text>
      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 }}>
        {syncSnapshot.lastSuccessAt ? `Last success: ${syncSnapshot.lastSuccessAt}` : "No successful sync yet."}
      </Text>
      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 6 }}>
        {isWeb
          ? "Web uses a no-op database; use Android for local-first sync."
          : syncSnapshot.status === "offline"
            ? "Offline — changes stay on this device and will sync when you reconnect."
            : signedInEmail
              ? "Sync uploads locally queued changes to your Supabase account."
              : "Sign in above before syncing."}
      </Text>
      {syncSnapshot.rejected > 0 && (
        <Button label="Retry rejected records" variant="secondary" onPress={onRetry} disabled={isSyncing} style={{ marginTop: 12 }} />
      )}
      {signedInEmail && (
        <>
          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 10 }}>
            {isWeb
              ? "Cloud restore is available in the Android app."
              : restoreAvailability === "checking"
                ? "Checking cloud backup availability…"
                : restoreAvailability === "available"
                  ? "A cloud backup is ready to restore to this empty database."
                  : restoreAvailability === "local-data"
                    ? "Restore is available only when this device has no saved logs."
                    : restoreAvailability === "no-backup"
                      ? "No cloud backup was found for this account."
                      : `Could not check cloud backup availability: ${restoreAvailabilityError ?? "unknown error"}`}
          </Text>
          <Button
            label="Restore from cloud"
            variant="secondary"
            onPress={onRestore}
            disabled={isWeb || isSyncing || restoreAvailability !== "available"}
            style={{ marginTop: 8 }}
          />
        </>
      )}
    </Card>
  );
}
