import { Text, type TextProps } from "react-native";

interface ApexTextProps extends TextProps {
  variant?: "display" | "body" | "body-medium" | "body-bold" | "mono";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  color?: "primary" | "secondary" | "muted" | "teal" | "success" | "warning" | "danger" | "gold";
}

const FONT_FAMILIES: Record<string, string> = {
  display: "BebasNeue_400Regular",
  body: "DMSans_400Regular",
  "body-medium": "DMSans_500Medium",
  "body-bold": "DMSans_700Bold",
  mono: "DMSans_400Regular", // fallback until JetBrains Mono is added
};

const FONT_SIZES: Record<string, number> = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

const COLORS: Record<string, string> = {
  primary: "#F0F0F5",
  secondary: "#8080A0",
  muted: "#4A4A6A",
  teal: "#00D4AA",
  success: "#00C875",
  warning: "#FFB800",
  danger: "#FF4757",
  gold: "#FFD700",
};

export function ApexText({
  variant = "body",
  size = "base",
  color = "primary",
  style,
  ...props
}: ApexTextProps) {
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
