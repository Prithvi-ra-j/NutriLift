import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24, paddingVertical: 34, gap: 10 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: M3.colors.surfaceVariant, borderWidth: 1, borderColor: M3.colors.outline, alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
        <Feather name={icon} size={24} color={M3.colors.onSurfaceMuted} />
      </View>
      <Text style={{ color: M3.colors.onSurface, fontSize: 17, lineHeight: 22, fontFamily: "DMSans_700Bold", textAlign: "center" }}>
        {title}
      </Text>
      <Text style={{ maxWidth: 300, color: M3.colors.onSurfaceVariant, fontSize: 13, lineHeight: 19, fontFamily: "DMSans_400Regular", textAlign: "center" }}>
        {subtitle}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.8} style={{ marginTop: 8, backgroundColor: M3.colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 }}>
          <Text style={{ color: M3.colors.onPrimary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
