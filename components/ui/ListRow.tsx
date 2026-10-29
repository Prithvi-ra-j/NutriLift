import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

interface ListRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tintColor?: string;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
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
  },
  disabled: { opacity: 0.5 },
  content: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: { flex: 1 },
  title: {
    color: M3.colors.onSurface,
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  subtitle: {
    color: M3.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    marginTop: 1,
  },
});

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  tintColor = M3.colors.primary,
  disabled = false,
  selected,
  testID,
}: ListRowProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ disabled, selected }}
      activeOpacity={0.75}
      disabled={disabled || !onPress}
      hitSlop={8}
      onPress={onPress}
      style={[styles.row, disabled && styles.disabled]}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: `${tintColor}22` }]}>
          <Feather name={icon} size={18} color={tintColor} />
        </View>
        <View style={styles.textContainer}>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceMuted} />
      ) : null}
    </TouchableOpacity>
  );
}
