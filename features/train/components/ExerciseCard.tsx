import { ReactNode } from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ExerciseLog } from "../../../lib/db/schema";
import type { ExerciseType } from "../../../lib/constants/exercises";
import { M3 } from "../../../design-system/tokens";
import { Card } from "../../../components/ui/Card";
import { PressableScale } from "../../../components/ui/PressableScale";

type Props = {
  exercise: ExerciseLog;
  exerciseType: ExerciseType;
  totalVolume: number;
  estimated1RM: number | null;
  progressionMessage?: string;
  previousPerformance?: string;
  onSwap: () => void;
  onDelete: () => void;
  children: ReactNode;
};

export function ExerciseCard({ exercise, exerciseType, totalVolume, estimated1RM, progressionMessage, previousPerformance, onSwap, onDelete, children }: Props) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...M3.typescale.headlineSmall, color: M3.colors.onSurface }}>{exercise.exercise_name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ ...M3.typescale.labelSmall, color: M3.colors.onSurfaceVariant, textTransform: "capitalize" }}>{exercise.muscle_group || "Other"}</Text>
            </View>
            <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ ...M3.typescale.labelSmall, color: M3.colors.onSurfaceVariant, textTransform: "capitalize" }}>{exercise.equipment || "Other"}</Text>
            </View>
            <View style={{ backgroundColor: M3.colors.primaryContainer, borderRadius: M3.shape.small, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ ...M3.typescale.labelSmall, color: M3.colors.primary }}>{exerciseType === "weight_reps" ? "Weight" : exerciseType === "reps_only" ? "Reps" : exerciseType === "duration" ? "Duration" : "Cardio"}</Text>
            </View>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4, marginLeft: 10 }}>
          {exerciseType === "weight_reps" ? <Text style={{ ...M3.typescale.bodySmall, color: M3.colors.onSurfaceVariant }}>{totalVolume.toFixed(0)}kg</Text> : null}
          {estimated1RM != null ? <Text style={{ ...M3.typescale.bodySmall, color: M3.colors.onSurfaceMuted }}>~{estimated1RM.toFixed(0)}kg 1RM</Text> : null}
          <View style={{ flexDirection: "row", gap: 2 }}>
            <PressableScale onPress={onSwap} accessibilityRole="button" accessibilityLabel={"Swap " + exercise.exercise_name} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Feather name="repeat" size={15} color={M3.colors.onSurfaceVariant} />
            </PressableScale>
            <PressableScale onPress={onDelete} accessibilityRole="button" accessibilityLabel={"Delete " + exercise.exercise_name} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Feather name="trash-2" size={15} color={M3.colors.error} />
            </PressableScale>
          </View>
        </View>
      </View>
      {progressionMessage ? <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: M3.shape.small, padding: 8, marginBottom: 8, flexDirection: "row", gap: 6 }}>
        <Feather name="trending-up" size={13} color={M3.colors.warning} />
        <Text style={{ ...M3.typescale.bodySmall, color: M3.colors.warning, flex: 1 }}>{progressionMessage}</Text>
      </View> : null}
      {previousPerformance ? <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
        <Text style={{ ...M3.typescale.labelSmall, color: M3.colors.onSurfaceVariant }}>Last time</Text>
        <Text style={{ ...M3.typescale.bodyMedium, color: M3.colors.onSurface, marginTop: 2 }}>{previousPerformance}</Text>
      </View> : null}
      {children}
    </Card>
  );
}
