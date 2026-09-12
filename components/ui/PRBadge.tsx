import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

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
      <Feather name="award" size={10} color={M3.colors.background} />
      <Text
        style={{
          color: M3.colors.background,
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
