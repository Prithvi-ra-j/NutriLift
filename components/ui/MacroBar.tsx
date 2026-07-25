import { View, Text } from "react-native";

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
        <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
          {label}
        </Text>
        <Text style={{ color: "#F0F0F5", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
          <Text style={{ color: over ? "#FFB800" : color }}>
            {current.toFixed(0)}{unit}
          </Text>
          <Text style={{ color: "#4A4A6A" }}> / {target}{unit}</Text>
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: "#1A1A26",
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
              left: "100%",
              height: "100%",
              width: `${overPct}%`,
              backgroundColor: "#FF4757",
              borderRadius: 3,
            }}
          />
        )}
      </View>
    </View>
  );
}
