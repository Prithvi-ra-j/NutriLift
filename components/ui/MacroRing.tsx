import { View, Text } from "react-native";
import { Fragment } from "react";
import Svg, { Circle } from "react-native-svg";
import { M3 } from "../../design-system/tokens";

interface MacroRingProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  calories: number;
  caloriesTarget: number;
}

export function MacroRing({
  protein,
  carbs,
  fat,
  proteinTarget,
  carbsTarget,
  fatTarget,
  calories,
  caloriesTarget,
}: MacroRingProps) {
  const size = 104;
  const center = size / 2;
  const rings = [
    { radius: 45, pct: caloriesTarget > 0 ? calories / caloriesTarget : 0, color: M3.colors.primary, width: 6 },
    { radius: 35, pct: proteinTarget > 0 ? protein / proteinTarget : 0, color: M3.colors.secondary, width: 5 },
    { radius: 26, pct: carbsTarget > 0 ? carbs / carbsTarget : 0, color: M3.colors.success, width: 4 },
  ];

  return (
    <View style={{ width: 122, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius;
            const progress = Math.max(0, Math.min(1, ring.pct));
            return (
              <Fragment key={ring.radius}>
                <Circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={M3.colors.surfaceContainerHigh}
                  strokeWidth={ring.width}
                  fill="none"
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.color}
                  strokeWidth={ring.width}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference + " " + circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  rotation="-90"
                  origin={center + ", " + center}
                />
              </Fragment>
            );
          })}
        </Svg>

        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 24, lineHeight: 26, fontFamily: "BebasNeue_400Regular" }}>
            {calories.toFixed(0)}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
            KCAL
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8 }}>
        {[
          { label: "P", pct: proteinTarget > 0 ? protein / proteinTarget : 0, color: M3.colors.secondary },
          { label: "C", pct: carbsTarget > 0 ? carbs / carbsTarget : 0, color: M3.colors.success },
          { label: "F", pct: fatTarget > 0 ? fat / fatTarget : 0, color: M3.macroColors.fat },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: item.color }} />
            <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_500Medium" }}>
              {item.label} {Math.round(item.pct * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
