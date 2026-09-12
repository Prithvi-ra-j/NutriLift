import React from 'react';
import { View, Pressable, Text, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CheckboxProps } from '../../core/types/component';

export const Checkbox = React.forwardRef<View, CheckboxProps>(
  ({ checked, onChange, disabled = false, label, indeterminate = false }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    const handlePress = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const isChecked = checked || indeterminate;
    const activeColor = disabled ? colors.onSurfaceVariant : colors.primary;
    const boxColor = isChecked ? activeColor : 'transparent';
    const borderColor = disabled
      ? colors.onSurfaceVariant
      : isChecked
      ? activeColor
      : colors.outline;

    return (
      <Pressable
        ref={ref as any}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          opacity: disabled ? 0.38 : 1,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 2,
              borderWidth: 2,
              borderColor,
              backgroundColor: boxColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {indeterminate ? (
              <View style={{ width: 10, height: 2, backgroundColor: colors.onPrimary }} />
            ) : checked ? (
              <View
                style={{
                  width: 10,
                  height: 5,
                  borderBottomWidth: 2,
                  borderLeftWidth: 2,
                  borderColor: colors.onPrimary,
                  transform: [{ rotate: '-45deg' }, { translateY: -1 }],
                }}
              />
            ) : null}
          </View>
        </View>
        {label && (
          <Text style={{ color: colors.onSurface, fontSize: 16, marginLeft: spacing.xs }}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
