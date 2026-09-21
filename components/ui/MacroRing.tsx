import { View, Text } from "react-native";
import { Canvas, Circle, Path, Skia } from "@shopify/react-native-skia";
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
  size?: number;
}

function arcPath(size: number, start: number, sweep: number, radius: number) {
  const center = size / 2;
  const path = Skia.Path.Make();
  const rect = Skia.XYWHRect(center - radius, center - radius, radius * 2, radius * 2);
  const startDeg = start - 90;
  path.addArc(rect, startDeg, sweep);
  return path;
}

export function MacroRing({
  protein, carbs, fat, proteinTarget, carbsTarget, fatTarget, calories, caloriesTarget, size = 112,
}: MacroRingProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const segments = [
    { value: protein, target: proteinTarget, color: M3.macroColors.protein },
    { value: carbs, target: carbsTarget, color: M3.macroColors.carbs },
    { value: fat, target: fatTarget, color: M3.macroColors.fat },
  ];
  const total = segments.reduce((sum, x) => sum + Math.max(0, x.target), 0) || 1;
  const gap = 5;
  let start = 0;

  return (
    <View style={{ width: size, alignItems: "center", justifyContent: "center" }}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} color={M3.colors.surfaceVariant} style="stroke" strokeWidth={stroke} />
        {segments.map((segment, index) => {
          const allocation = (Math.max(0, segment.target) / total) * 360;
          const sweep = Math.max(0, allocation - gap);
          const progress = Math.min(1, segment.target > 0 ? Math.max(0, segment.value) / segment.target : 0);
          const path = arcPath(size, start + gap / 2, sweep * progress, radius);
          start += allocation;
          return <Path key={index} path={path} color={segment.color} style="stroke" strokeWidth={stroke} strokeCap="round" />;
        })}
      </Canvas>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ color: M3.colors.onSurface, fontSize: 28, fontFamily: "BebasNeue_400Regular", lineHeight: 30 }}>
          {Math.round(calories)}
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
          / {Math.round(caloriesTarget)} kcal
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {segments.map((s) => (
          <View key={s.color} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
              {Math.round(s.target ? (s.value / s.target) * 100 : 0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
