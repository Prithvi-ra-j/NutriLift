import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

interface ListRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tintColor?: string;
}

/** Icon-badge + title/subtitle + chevron row — the "navigate to X" pattern repeated across More/settings screens. */
export function ListRow({ icon, title, subtitle, onPress, tintColor = M3.colors.primary }: ListRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: M3.colors.surface,
        borderRadius: M3.shape.large,
        borderWidth: 1,
        borderColor: M3.colors.outline,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tintColor + "22", alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={18} color={tintColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceMuted} />
    </TouchableOpacity>
  );
}
