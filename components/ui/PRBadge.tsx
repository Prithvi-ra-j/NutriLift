import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

export function PRBadge() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFD700",
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        gap: 3,
      }}
    >
      <Feather name="award" size={10} color="#0A0A0F" />
      <Text
        style={{
          color: "#0A0A0F",
          fontSize: 10,
          fontFamily: "DMSans_700Bold",
          letterSpacing: 0.5,
        }}
      >
        PR
      </Text>
    </View>
  );
}
