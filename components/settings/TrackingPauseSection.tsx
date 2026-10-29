import { Text } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";

interface TrackingPauseSectionProps {
  onToggle: () => void;
  trackingPause: { paused: boolean; until: string | null };
}

export function TrackingPauseSection({
  onToggle,
  trackingPause,
}: TrackingPauseSectionProps) {
  return (
    <Card>
      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
        TRACKING PAUSE
      </Text>
      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18, marginBottom: 12 }}>
        {trackingPause.paused
          ? `Tracking is paused through ${trackingPause.until}. Paused days are skipped, not scored.`
          : "Pause scoring for illness, travel, or rest. Logging remains available."}
      </Text>
      <Button
        label={trackingPause.paused ? "Resume tracking" : "Pause for 7 days"}
        variant={trackingPause.paused ? "secondary" : "primary"}
        onPress={onToggle}
      />
    </Card>
  );
}
