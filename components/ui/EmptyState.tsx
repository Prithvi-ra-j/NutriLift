import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: M3.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: M3.colors.onSurface,
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  subtitle: {
    color: M3.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    minHeight: 48,
    justifyContent: "center",
    marginTop: 8,
    backgroundColor: M3.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  actionText: {
    color: M3.colors.onPrimary,
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
});

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={28} color={M3.colors.onSurfaceMuted} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={styles.title}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={styles.action}
          testID="empty-state.action"
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.actionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
