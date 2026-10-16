import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionIcon?: React.ComponentProps<typeof Feather>["name"];
  actionLabel?: string;
  onAction?: () => void;
}

export function ScreenHeader({ title, subtitle, actionIcon, actionLabel, onAction }: ScreenHeaderProps) {
  return (
    <View style={{ minHeight: 54, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={{ color: M3.colors.onSurface, fontSize: 34, lineHeight: 38, fontFamily: "BebasNeue_400Regular", letterSpacing: 0.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, lineHeight: 18, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={{
            minWidth: 40,
            height: 40,
            paddingHorizontal: actionLabel ? 12 : 0,
            borderRadius: 20,
            backgroundColor: actionLabel ? M3.colors.primary : M3.colors.surface,
            borderWidth: 1,
            borderColor: actionLabel ? M3.colors.primary : M3.colors.outline,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {actionIcon && <Feather name={actionIcon} size={15} color={actionLabel ? M3.colors.onPrimary : M3.colors.onSurface} />}
          {actionLabel ? <Text style={{ color: M3.colors.onPrimary, fontSize: 12, fontFamily: "DMSans_700Bold" }}>{actionLabel}</Text> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
