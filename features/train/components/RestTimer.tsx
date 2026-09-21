import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../../design-system/tokens";
import { PressableScale } from "../../../components/ui/PressableScale";

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

interface RestTimerProps {
  seconds: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function RestTimer({ seconds, running, onStart, onPause, onReset }: RestTimerProps) {
  if (seconds <= 0) {
    return (
      <PressableScale onPress={onStart} haptic accessibilityRole="button" accessibilityLabel="Start 90 second rest timer" style={{ minHeight: 44, borderRadius: M3.shape.medium, backgroundColor: M3.colors.surfaceVariant, borderWidth: 1, borderColor: M3.colors.outline, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Feather name="clock" size={17} color={M3.colors.primary} />
        <Text style={{ ...M3.typescale.labelLarge, color: M3.colors.primary }}>Start 90s rest</Text>
      </PressableScale>
    );
  }

  return (
    <View style={{ minHeight: 56, borderRadius: M3.shape.large, backgroundColor: M3.colors.primaryContainer, borderWidth: 1, borderColor: M3.colors.primary, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Feather name="clock" size={18} color={M3.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...M3.typescale.labelMedium, color: M3.colors.primary }}>REST</Text>
        <Text style={{ ...M3.typescale.headlineSmall, color: M3.colors.onSurface }}>{formatSeconds(seconds)}</Text>
      </View>
      <PressableScale onPress={running ? onPause : onStart} accessibilityRole="button" accessibilityLabel={running ? "Pause rest timer" : "Resume rest timer"} style={{ width: 40, height: 40, borderRadius: M3.shape.full, alignItems: "center", justifyContent: "center", backgroundColor: M3.colors.surface }}>
        <Feather name={running ? "pause" : "play"} size={17} color={M3.colors.primary} />
      </PressableScale>
      <PressableScale onPress={onReset} accessibilityRole="button" accessibilityLabel="Reset rest timer" style={{ width: 40, height: 40, borderRadius: M3.shape.full, alignItems: "center", justifyContent: "center" }}>
        <Feather name="x" size={17} color={M3.colors.onSurfaceVariant} />
      </PressableScale>
    </View>
  );
}
