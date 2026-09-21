import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ExerciseType } from "../../../lib/constants/exercises";
import type { SetLog } from "../../../lib/db/schema";
import { M3 } from "../../../design-system/tokens";
import { PressableScale } from "../../../components/ui/PressableScale";
import { PRBadge } from "../../../components/ui/PRBadge";

function label(set: SetLog, type: ExerciseType): string {
  switch (type) {
    case "reps_only":
      return `× ${set.reps} reps`;
    case "duration": {
      const seconds = set.duration_sec ?? set.reps ?? 0;
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return minutes ? `${minutes}m ${remainder ? `${remainder}s` : ""}` : `${seconds}s`;
    }
    case "distance_duration": {
      const distance = set.distance_km ?? 0;
      const minutes = set.duration_sec != null ? Math.round(set.duration_sec / 60) : set.reps;
      return `${distance.toFixed(1)}km · ${minutes}min`;
    }
    default:
      return `${set.weight_kg}kg × ${set.reps}`;
  }
}

export function SetRow({ set, exerciseType, onEdit }: { set: SetLog; exerciseType: ExerciseType; onEdit: () => void }) {
  return (
    <PressableScale
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Edit set ${set.set_number}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: set.is_warmup ? M3.colors.surfaceVariant : M3.colors.surfaceContainer,
        borderRadius: M3.shape.small,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: set.is_pr === 1 ? M3.colors.warning : M3.colors.outline,
      }}
    >
      <Text style={{ ...M3.typescale.labelMedium, color: set.is_warmup ? M3.colors.onSurfaceMuted : M3.colors.onSurface }}>
        {label(set, exerciseType)}
      </Text>
      {set.is_pr === 1 ? <PRBadge /> : null}
      <Feather name="edit-2" size={10} color={M3.colors.onSurfaceMuted} />
    </PressableScale>
  );
}
