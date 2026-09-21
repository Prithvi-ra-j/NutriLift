import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  secondaryAction?: { label: string; onPress: () => void };
}

export function ErrorState({
  title = "Couldn't load this section",
  message = "Something went wrong while loading your data. You can retry without losing your saved information.",
  onRetry,
  retryLabel = "Try again",
  secondaryAction,
}: ErrorStateProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: M3.spacing.xxl, gap: M3.spacing.md }}>
      <View style={{ width: 48, height: 48, borderRadius: M3.shape.full, backgroundColor: M3.colors.errorContainer, alignItems: "center", justifyContent: "center" }}>
        <Feather name="alert-circle" size={22} color={M3.colors.error} />
      </View>
      <Text style={{ ...M3.typescale.headlineSmall, color: M3.colors.onSurface, textAlign: "center" }}>{title}</Text>
      <Text style={{ ...M3.typescale.bodyMedium, color: M3.colors.onSurfaceVariant, textAlign: "center", lineHeight: 20 }}>{message}</Text>
      <Button label={retryLabel} icon="refresh-cw" onPress={onRetry} />
      {secondaryAction ? <Button label={secondaryAction.label} variant="secondary" onPress={secondaryAction.onPress} /> : null}
    </View>
  );
}
