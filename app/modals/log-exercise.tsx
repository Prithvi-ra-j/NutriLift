import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { M3 } from "../../design-system/tokens";

// Exercise logging is handled inline in the workout tab
// This modal is a placeholder for future AI-based exercise parsing
export default function LogExerciseModal() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
        <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
          LOG EXERCISE
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Feather name="zap" size={48} color={M3.colors.onSurfaceMuted} />
        <Text style={{ color: M3.colors.onSurface, fontSize: 17, fontFamily: "DMSans_700Bold", marginTop: 16, textAlign: "center" }}>
          Use the Workout Tab
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Exercise logging is done inline in the Workout tab for the best experience.
        </Text>
        <TouchableOpacity
          onPress={() => { router.back(); router.push("/(tabs)/workout"); }}
          style={{ marginTop: 24, backgroundColor: M3.colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Text style={{ color: M3.colors.background, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
            Go to Workout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
