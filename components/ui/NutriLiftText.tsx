import { Text, type TextProps } from "react-native";
import { M3 } from "../../design-system/tokens";

interface NutriLiftTextProps extends TextProps {
  variant?: "display" | "body" | "body-medium" | "body-bold" | "mono";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  color?: "primary" | "secondary" | "muted" | "teal" | "success" | "warning" | "danger" | "gold";
}

const FONT_FAMILIES = {
  display: M3.typescale.displaySmall.fontFamily,
  body: M3.typescale.bodyLarge.fontFamily,
  "body-medium": M3.typescale.titleMedium.fontFamily,
  "body-bold": M3.typescale.headlineSmall.fontFamily,
  mono: M3.typescale.bodyMedium.fontFamily,
} as const;

const FONT_SIZES: Record<NutriLiftTextProps["size"] & string, number> = {
  xs: 12,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

const COLORS = {
  primary: M3.colors.onSurface,
  secondary: M3.colors.onSurfaceVariant,
  muted: M3.colors.onSurfaceMuted,
  teal: M3.colors.primary,
  success: M3.colors.success,
  warning: M3.colors.warning,
  danger: M3.colors.error,
  gold: M3.colors.pr,
} as const;

export function NutriLiftText({
  variant = "body",
  size = "base",
  color = "primary",
  style,
  ...props
}: NutriLiftTextProps) {
  return (
    <Text
      style={[
        {
          fontFamily: FONT_FAMILIES[variant],
          fontSize: FONT_SIZES[size],
          color: COLORS[color],
        },
        style,
      ]}
      {...props}
    />
  );
}
