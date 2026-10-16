import { View, Text } from "react-native";
import { M3 } from "../../design-system/tokens";

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, target, color, unit = "g" }: MacroBarProps) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  const over = current > target;
  const overPct = over && target > 0 ? ((current - target) / target) * 100 : 0;

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
          {label}
        </Text>
        <Text style={{ color: M3.colors.onSurface, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
          <Text style={{ color: over ? M3.colors.warning : color }}>
            {current.toFixed(0)}{unit}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceMuted }}> / {target}{unit}</Text>
        </Text>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: M3.colors.surfaceContainerHigh,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        {/* Base bar up to target */}
        <View
          style={{
            position: "absolute",
            height: "100%",
            width: `${Math.min(100, pct)}%`,
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
        {/* Red portion for amount over target */}
        {over && (
          <View
            style={{
              position: "absolute",
              right: 0,
              height: "100%",
              width: `${Math.min(100, overPct)}%`,
              backgroundColor: M3.colors.error,
              borderRadius: 3,
            }}
          />
        )}
      </View>
    </View>
  );
}
