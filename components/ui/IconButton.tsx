import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
}

const styles = StyleSheet.create({
  button: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: M3.shape.full,
  },
  disabled: { opacity: 0.5 },
});

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  selected,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
      testID={testID}
    >
      <Feather
        name={icon}
        size={20}
        color={disabled ? M3.colors.onSurfaceMuted : M3.colors.onSurface}
      />
    </Pressable>
  );
}
