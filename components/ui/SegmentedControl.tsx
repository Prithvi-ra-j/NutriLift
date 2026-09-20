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

/** Pill-style segmented control — replaces repeated ad-hoc "section tab" rows. */
export function SegmentedControl<T extends string>({ segments, active, onChange }: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: M3.colors.surface,
        borderRadius: M3.shape.large,
        borderWidth: 1,
        borderColor: M3.colors.outline,
        padding: 4,
        gap: 2,
      }}
    >
      {segments.map((s) => {
        const isActive = s.key === active;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onChange(s.key)}
            activeOpacity={0.75}
            style={{
              flex: 1,
              backgroundColor: isActive ? M3.colors.primary : "transparent",
              borderRadius: M3.shape.medium,
              paddingVertical: 9,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
              shadowColor: isActive ? M3.colors.primary : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
              elevation: isActive ? 3 : 0,
            }}
          >
            {s.icon && (
              <Feather name={s.icon} size={13} color={isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant} />
            )}
            <Text
              style={{
                color: isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant,
                fontSize: 12,
                fontFamily: isActive ? "DMSans_700Bold" : "DMSans_500Medium",
              }}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
