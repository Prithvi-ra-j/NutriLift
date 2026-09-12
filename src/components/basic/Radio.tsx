import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { RadioProps, RadioGroupProps } from '../../core/types/component';

export const Radio = React.forwardRef<View, RadioProps>(
  ({ selected, onChange, disabled = false, label }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    const handlePress = () => {
      if (!disabled) {
        onChange(!selected);
      }
    };

    const activeColor = disabled ? colors.onSurfaceVariant : colors.primary;
    const borderColor = disabled
      ? colors.onSurfaceVariant
      : selected
      ? activeColor
      : colors.outline;

    return (
      <Pressable
        ref={ref as any}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
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
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {selected && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: activeColor,
                }}
              />
            )}
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

Radio.displayName = 'Radio';

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  disabled = false,
  children,
}) => {
  return (
    <View accessibilityRole="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement<RadioProps>(child)) {
          return React.cloneElement(child, {
            selected: (child.props as any).value === value,
            onChange: () => onChange((child.props as any).value as string),
            disabled: disabled || child.props.disabled,
          } as any);
        }
        return child;
      })}
    </View>
  );
};
