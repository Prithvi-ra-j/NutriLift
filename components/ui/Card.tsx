import { View, type ViewProps, type ViewStyle } from "react-native";
import { M3 } from "../../design-system/tokens";

type CardVariant = "filled" | "elevated" | "outlined";

interface CardProps extends ViewProps {
  /**
   * M3 Card variants:
   * - "filled"   → surface color, subtle border (default)
   * - "elevated" → surfaceVariant (one level up), no border
   * - "outlined" → transparent bg, visible outline border
   */
  variant?: CardVariant;
  /** @deprecated — use variant="elevated" instead */
  elevated?: boolean;
  /** Optional noPadding for cards that manage their own internal padding */
  noPadding?: boolean;
}

export function Card({
  variant,
  elevated,
  noPadding = false,
  style,
  children,
  ...props
}: CardProps) {
  // Back-compat: elevated prop → elevated variant
  const resolvedVariant: CardVariant = variant ?? (elevated ? "elevated" : "filled");

  const variantStyle: ViewStyle = (() => {
    switch (resolvedVariant) {
      case "elevated":
        return {
          backgroundColor: M3.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: M3.colors.outline,
          shadowColor: M3.colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 6,
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: M3.colors.outlineVariant,
        };
      case "filled":
      default:
        return {
          backgroundColor: M3.colors.surface,
          borderWidth: 1,
          borderColor: M3.colors.outline,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 3,
        };
    }
  })();

  return (
    <View
      style={[
        {
          borderRadius: M3.shape.large,       // 16px — M3 card spec
          padding: noPadding ? 0 : M3.spacing.lg,
        },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
