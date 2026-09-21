import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { PressableScale } from "./PressableScale";

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: M3.spacing.xxxl,
        gap: M3.spacing.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: M3.shape.full,
          backgroundColor: M3.colors.surfaceVariant,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Feather name={icon} size={28} color={M3.colors.onSurfaceMuted} />
      </View>
      <Text
        style={{
          color: M3.colors.onSurface,
          fontSize: 17,
          fontFamily: "DMSans_700Bold",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: M3.colors.onSurfaceVariant,
          fontSize: 14,
          fontFamily: "DMSans_400Regular",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <PressableScale
          onPress={onAction}
          style={{
            marginTop: 8,
            backgroundColor: M3.colors.primary,
            borderRadius: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: M3.colors.background,
              fontSize: 14,
              fontFamily: "DMSans_700Bold",
            }}
          >
            {actionLabel}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}
