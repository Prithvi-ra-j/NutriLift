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
  const overPct = over ? ((current - target) / target) * 100 : 0;

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
          {label}
        </Text>
        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
          <Text style={{ color: over ? M3.colors.warning : color }}>
            {current.toFixed(0)}{unit}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceMuted }}> / {target}{unit}</Text>
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: M3.colors.surfaceVariant,
          borderRadius: 3,
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
            borderRadius: 3,
          }}
        />
        {/* Red portion for amount over target */}
        {over && (
          <View
            style={{
              position: "absolute",
              left: `${Math.min(100, pct)}%`,
              height: "100%",
              width: `${Math.min(100 - Math.min(100, pct), overPct)}%`,
              backgroundColor: M3.colors.error,
              borderRadius: 3,
            }}
          />
        )}
      </View>
    </View>
  );
}
