import { Text, View } from "react-native";
import type { WorkoutSession } from "../../lib/data/types";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";

interface WorkoutSummaryBarProps {
  exerciseCount: number;
  session: WorkoutSession;
  setCount: number;
}

export function WorkoutSummaryBar({
  exerciseCount,
  session,
  setCount,
}: WorkoutSummaryBarProps) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
            {session.day_type}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Day Type
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
            {exerciseCount}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Exercises
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
            {setCount}
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Sets
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: M3.colors.primary, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
            {((session.total_volume_kg ?? 0) / 1000).toFixed(1)}t
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            Volume
          </Text>
          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
            ({(session.total_volume_kg ?? 0).toFixed(0)}kg)
          </Text>
        </View>
      </View>
    </Card>
  );
}
