import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: M3.shape.medium,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBorder: { borderWidth: 1, borderColor: M3.colors.outline },
  dangerBorder: { borderWidth: 1, borderColor: M3.colors.error },
  disabledSecondary: { opacity: 0.5 },
  label: { fontSize: 14, fontFamily: "DMSans_700Bold" },
});

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const colors = {
    secondary: { bg: M3.colors.surface, fg: M3.colors.onSurface },
    ghost: { bg: "transparent", fg: M3.colors.primary },
    danger: {
      bg: isDisabled ? M3.colors.surfaceVariant : M3.colors.errorContainer,
      fg: M3.colors.error,
    },
    primary: {
      bg: isDisabled ? M3.colors.surfaceVariant : M3.colors.primary,
      fg: isDisabled ? M3.colors.onSurfaceMuted : M3.colors.onPrimary,
    },
  }[variant];

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.75}
      disabled={isDisabled}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.bg },
        variant === "secondary" && styles.secondaryBorder,
        variant === "danger" && styles.dangerBorder,
        isDisabled && variant !== "primary" && styles.disabledSecondary,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        icon && <Feather name={icon} size={16} color={colors.fg} />
      )}
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}
