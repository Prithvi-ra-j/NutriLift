import { Text, TouchableOpacity, View } from "react-native";
import { M3 } from "../../design-system/tokens";

interface ScreenLoadErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ScreenLoadErrorBanner({
  message,
  onRetry,
}: ScreenLoadErrorBannerProps) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: M3.colors.errorContainer,
        borderRadius: 8,
        padding: 12,
      }}
    >
      <Text style={{ color: M3.colors.onErrorContainer, fontFamily: "DMSans_400Regular" }}>
        Could not load this screen: {message}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onRetry}
        style={{ alignSelf: "flex-start", paddingTop: 8 }}
      >
        <Text style={{ color: M3.colors.onErrorContainer, fontFamily: "DMSans_700Bold" }}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}
