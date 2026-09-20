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
}: MacroRingProps) {
  const size = 90;

  // Calculate percentages
  const proteinPct = Math.min(100, (protein / proteinTarget) * 100);
  const carbsPct = Math.min(100, (carbs / carbsTarget) * 100);
  const fatPct = Math.min(100, (fat / fatTarget) * 100);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Main circle with stacked colored bars */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: M3.colors.surfaceVariant,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: M3.colors.surfaceContainer,
          overflow: "hidden",
        }}
      >
        {/* Colored segments as horizontal bars */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "33.33%",
            backgroundColor: M3.colors.secondary,
            opacity: proteinPct / 100,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "33.33%",
            left: 0,
            right: 0,
            height: "33.33%",
            backgroundColor: M3.colors.success,
            opacity: carbsPct / 100,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "33.34%",
            backgroundColor: M3.macroColors.fat,
            opacity: fatPct / 100,
          }}
        />

        {/* Center content overlay */}
        <View
          style={{
            width: size - 20,
            height: size - 20,
            borderRadius: (size - 20) / 2,
            backgroundColor: M3.colors.surfaceVariant,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
            {calories.toFixed(0)}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
            kcal
          </Text>
        </View>
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
