import { View, Text } from "react-native";
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
  const size = 94;
  const caloriePct = Math.min(100, caloriesTarget > 0 ? (calories / caloriesTarget) * 100 : 0);

  // Calculate percentages
  const proteinPct = Math.min(100, (protein / proteinTarget) * 100);
  const carbsPct = Math.min(100, (carbs / carbsTarget) * 100);
  const fatPct = Math.min(100, (fat / fatTarget) * 100);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Compact calorie ring — macros are shown as readable bars alongside it. */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: M3.colors.surfaceVariant,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 5,
          borderColor: M3.colors.primary,
        }}
        accessibilityRole="progressbar"
        accessibilityLabel={`${calories.toFixed(0)} of ${caloriesTarget} calories consumed`}
        accessibilityValue={{ min: 0, max: caloriesTarget, now: Math.min(caloriesTarget, calories) }}
      >
        <Text style={{ color: M3.colors.onSurface, fontSize: 21, fontFamily: "DMSans_700Bold", letterSpacing: -0.8 }}>
          {calories.toFixed(0)}
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_500Medium" }}>
          kcal
        </Text>
        <Text style={{ color: M3.colors.primary, fontSize: 9, fontFamily: "DMSans_700Bold", marginTop: 1 }}>
          {caloriePct.toFixed(0)}%
        </Text>
      </View>

      {/* Macro indicators below */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M3.colors.secondary }} />
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
            P {proteinPct.toFixed(0)}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M3.colors.success }} />
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
            C {carbsPct.toFixed(0)}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M3.macroColors.fat }} />
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
            F {fatPct.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
}
