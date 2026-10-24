import { Pressable, StyleSheet, Text, View } from "react-native";
import { M3 } from "../../design-system/tokens";
import type { MeasurementTimeOfDay } from "../../lib/db/schema";

const options: { value: MeasurementTimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: M3.shape.medium,
    backgroundColor: M3.colors.surfaceVariant,
  },
  selected: { backgroundColor: M3.colors.primaryContainer },
  label: {
    color: M3.colors.onSurfaceVariant,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  selectedLabel: { color: M3.colors.onPrimaryContainer },
});

export function MeasurementTimeOfDaySelector({
  value,
  onChange,
}: {
  value: MeasurementTimeOfDay | null;
  onChange: (value: MeasurementTimeOfDay) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
