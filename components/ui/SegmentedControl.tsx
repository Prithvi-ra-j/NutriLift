import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  testID?: string;
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    backgroundColor: M3.colors.surface,
    borderRadius: M3.shape.large,
    borderWidth: 1,
    borderColor: M3.colors.outline,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: M3.shape.medium,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  active: {
    backgroundColor: M3.colors.primary,
    shadowColor: M3.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  activeLabel: {
    color: M3.colors.onPrimary,
    fontFamily: "DMSans_700Bold",
  },
  inactiveLabel: { color: M3.colors.onSurfaceVariant },
});

export function SegmentedControl<T extends string>({
  segments,
  active,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group} testID={testID}>
      {segments.map((segment) => {
        const isActive = segment.key === active;
        const testSegmentId = testID ? `${testID}.${segment.key}` : undefined;
        return (
          <TouchableOpacity
            key={segment.key}
            accessibilityLabel={segment.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.75}
            hitSlop={8}
            onPress={() => onChange(segment.key)}
            style={[styles.segment, isActive && styles.active]}
            testID={testSegmentId}
          >
            {segment.icon ? (
              <Feather
                name={segment.icon}
                size={13}
                color={
                  isActive ? M3.colors.onPrimary : M3.colors.onSurfaceVariant
                }
              />
            ) : null}
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
