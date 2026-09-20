import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "../../lib/logger";
import * as FileSystem from "expo-file-system/legacy";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import { M3 } from "../../design-system/tokens";

export default function ViewLogsModal() {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        const webLogs = await logger.exportWebLogs();
        setLogs(webLogs || "No logs available");
      } else {
        const logFilePath = await logger.getLogFilePath();
        if (logFilePath) {
          const content = await FileSystem.readAsStringAsync(logFilePath);
          setLogs(content);
        } else {
          setLogs("No log file available");
        }
      }
    } catch (error) {
      setLogs(`Error loading logs: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        // On web, download as file
        const blob = new Blob([logs], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nutrilift-logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // On native, use Share API
        await Share.share({
          message: logs,
          title: "NutriLift Logs",
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share logs");
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Clear Logs",
      "Are you sure you want to clear all logs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            logger.clearWebLogs();
            setLogs("Logs cleared");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader
        title="APP LOGS"
        rightIcon={Platform.OS === "web" ? "trash-2" : "share"}
        onRightPress={Platform.OS === "web" ? handleClear : handleShare}
      />

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, ...M3.typescale.bodyLarge }}>
            Loading logs...
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 4 }}>
          <View
            style={{
              backgroundColor: M3.colors.surface,
              borderRadius: M3.shape.medium,
              padding: M3.spacing.lg,
              borderWidth: 1,
              borderColor: M3.colors.outline,
            }}
          >
            <Text
              style={{
                color: M3.colors.onSurfaceVariant,
                fontSize: 11,
                fontFamily: "DMSans_400Regular",
                lineHeight: 18,
              }}
            >
              {logs}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Actions */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 8, paddingTop: 12 }}>
        {Platform.OS === "web" && (
          <Button label="Share / Download" icon="share" variant="secondary" onPress={handleShare} />
        )}
        <Button label="Refresh Logs" icon="refresh-cw" onPress={loadLogs} />
      </View>
    </SafeAreaView>
  );
}
