import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

// Exercise logging is handled inline in the workout tab
// This modal is a placeholder for future AI-based exercise parsing
export default function LogExerciseModal() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
          LOG EXERCISE
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color="#8080A0" />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Feather name="zap" size={48} color="#4A4A6A" />
        <Text style={{ color: "#F0F0F5", fontSize: 17, fontFamily: "DMSans_700Bold", marginTop: 16, textAlign: "center" }}>
          Use the Workout Tab
        </Text>
        <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Exercise logging is done inline in the Workout tab for the best experience.
        </Text>
        <TouchableOpacity
          onPress={() => { router.back(); router.push("/(tabs)/workout"); }}
          style={{ marginTop: 24, backgroundColor: "#00D4AA", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Text style={{ color: "#0A0A0F", fontSize: 14, fontFamily: "DMSans_700Bold" }}>
            Go to Workout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
