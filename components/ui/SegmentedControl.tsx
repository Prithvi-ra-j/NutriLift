import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

export interface Segment<T extends string> {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  active: T;
  onChange: (key: T) => void;
}

export function SegmentedControl<T extends string>({ segments, active, onChange }: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: M3.colors.surface,
        borderRadius: M3.shape.extraLarge,
        borderWidth: 1,
        borderColor: M3.colors.outline,
        padding: 3,
      }}
    >
      {segments.map((s) => {
        const isActive = s.key === active;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onChange(s.key)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              minHeight: 40,
              backgroundColor: isActive ? M3.colors.primary : "transparent",
              borderRadius: M3.shape.extraLarge,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
            }}
          >
            {s.icon ? <Feather name={s.icon} size={13} color={isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant} /> : null}
            <Text
              style={{
                color: isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant,
                fontSize: 11,
                fontFamily: isActive ? "DMSans_700Bold" : "DMSans_500Medium",
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
