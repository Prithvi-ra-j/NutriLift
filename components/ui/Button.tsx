import { Text, ActivityIndicator, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { PressableScale } from "./PressableScale";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Shared button primitive — replaces the hand-rolled TouchableOpacity styling repeated across screens. */
export function Button({ label, onPress, variant = "primary", icon, loading = false, disabled = false, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  const { bg, border, fg } = (() => {
    switch (variant) {
      case "secondary":
        return { bg: M3.colors.surface, border: M3.colors.outline, fg: M3.colors.onSurface };
      case "ghost":
        return { bg: "transparent", border: "transparent", fg: M3.colors.primary };
      case "danger":
        return { bg: isDisabled ? M3.colors.surfaceVariant : M3.colors.errorContainer, border: M3.colors.error, fg: M3.colors.error };
      case "primary":
      default:
        return { bg: isDisabled ? M3.colors.surfaceVariant : M3.colors.primary, border: "transparent", fg: isDisabled ? M3.colors.onSurfaceMuted : M3.colors.onPrimary };
    }
  })();

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={variant === "primary"}
      style={[
        {
          backgroundColor: bg,
          borderWidth: variant === "secondary" || variant === "danger" ? 1 : 0,
          borderColor: border,
          borderRadius: M3.shape.medium,
          paddingVertical: 13,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isDisabled && variant !== "primary" ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        icon && <Feather name={icon} size={16} color={fg} />
      )}
      <Text style={{ color: fg, fontSize: 15, fontFamily: "DMSans_700Bold" }}>{label}</Text>
    </PressableScale>
  );
}
