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

/** Consistent large-title header used across every tab for a unified visual rhythm. */
export function ScreenHeader({ title, subtitle, actionIcon, actionLabel, onAction }: ScreenHeaderProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: M3.colors.onSurface,
            fontSize: 30,
            fontFamily: "BebasNeue_400Regular",
            letterSpacing: 1,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.75}
          style={{
            backgroundColor: M3.colors.primary,
            borderRadius: M3.shape.medium,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            shadowColor: M3.colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {actionIcon && <Feather name={actionIcon} size={15} color={M3.colors.onPrimary} />}
          {actionLabel && (
            <Text style={{ color: M3.colors.onPrimary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              {actionLabel}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
