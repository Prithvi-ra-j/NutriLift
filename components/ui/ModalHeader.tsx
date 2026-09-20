import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { M3 } from "../../design-system/tokens";

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  rightIcon?: React.ComponentProps<typeof Feather>["name"];
  onRightPress?: () => void;
}

/** Consistent modal chrome: drag handle + title row + close button, used across all app/modals/*. */
export function ModalHeader({ title, subtitle, onClose, rightIcon, onRightPress }: ModalHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
      {/* Sheet drag handle — signals "swipe/tap to dismiss" affordance */}
      <View
        style={{
          alignSelf: "center",
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: M3.colors.outlineVariant,
          marginBottom: 14,
        }}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 20, fontFamily: "BebasNeue_400Regular", letterSpacing: 0.5 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightPress}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: M3.colors.surface,
                borderWidth: 1,
                borderColor: M3.colors.outline,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={rightIcon} size={15} color={M3.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onClose ?? (() => router.back())}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: M3.colors.surface,
              borderWidth: 1,
              borderColor: M3.colors.outline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="x" size={16} color={M3.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
