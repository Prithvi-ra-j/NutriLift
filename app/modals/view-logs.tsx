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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "../../lib/logger";
import * as FileSystem from "expo-file-system/legacy";
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
        a.download = `apex-logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // On native, use Share API
        await Share.share({
          message: logs,
          title: "Apex Logs",
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
    <View className="flex-1 bg-[#0A0A0F]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={M3.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text className="text-white font-bebas text-2xl">App Logs</Text>
        <View className="flex-row gap-4">
          {Platform.OS === "web" && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="trash-outline" size={24} color={M3.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={M3.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 font-dm">Loading logs...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-4">
          <View className="bg-black/50 rounded-lg p-4">
            <Text className="text-gray-300 font-mono text-xs leading-5">
              {logs}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Refresh Button */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          onPress={loadLogs}
          className="bg-[#00D4AA] rounded-lg py-4 items-center"
        >
          <Text className="text-black font-dm-bold text-base">Refresh Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
