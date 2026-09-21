import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../../design-system/tokens";
import { Button } from "../../../components/ui/Button";

interface WorkoutSummaryProps {
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  prCount: number;
  durationMin: number | null;
  onDone?: () => void;
}

export function WorkoutSummary({ exerciseCount, setCount, volumeKg, prCount, durationMin, onDone }: WorkoutSummaryProps) {
  return (
    <View style={{ backgroundColor: M3.colors.surface, borderRadius: M3.shape.large, borderWidth: 1, borderColor: M3.colors.primary, padding: M3.spacing.xl, gap: M3.spacing.lg }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: M3.colors.successContainer, alignItems: "center", justifyContent: "center" }}>
          <Feather name="check" size={26} color={M3.colors.success} />
        </View>
        <Text style={{ ...M3.typescale.headlineLarge, color: M3.colors.onSurface }}>Workout complete</Text>
        <Text style={{ ...M3.typescale.bodyMedium, color: M3.colors.onSurfaceVariant }}>Session saved to your training history.</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {[
          ["Exercises", String(exerciseCount)],
          ["Working sets", String(setCount)],
          ["Volume", `${(volumeKg / 1000).toFixed(1)}t`],
          ["PRs", String(prCount)],
        ].map(([label, value]) => (
          <View key={label} style={{ alignItems: "center", minWidth: 60 }}>
            <Text style={{ ...M3.typescale.headlineMedium, color: M3.colors.onSurface }}>{value}</Text>
            <Text style={{ ...M3.typescale.labelSmall, color: M3.colors.onSurfaceVariant, textAlign: "center" }}>{label}</Text>
          </View>
        ))}
      </View>
      {durationMin != null && <Text style={{ ...M3.typescale.bodySmall, color: M3.colors.onSurfaceVariant, textAlign: "center" }}>{durationMin} min session</Text>}
      {onDone && <Button label="Done" icon="check" onPress={onDone} />}
    </View>
  );
}
