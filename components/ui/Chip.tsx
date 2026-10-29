import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { M3 } from "../../design-system/tokens";

interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: M3.shape.full,
    borderWidth: 1,
    borderColor: M3.colors.outline,
    backgroundColor: M3.colors.surface,
  },
  selected: {
    borderColor: M3.colors.primary,
    backgroundColor: M3.colors.primaryContainer,
  },
  disabled: { opacity: 0.5 },
  label: { color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_500Medium" },
  selectedLabel: { color: M3.colors.onPrimaryContainer },
});

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  testID,
  style,
}: ChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}
