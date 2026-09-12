import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SwitchProps } from '../../core/types/component';

export const Switch = React.forwardRef<View, SwitchProps>(
  ({ value, onChange, disabled = false, label }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    const slideAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [value, slideAnim]);

    const handlePress = () => {
      if (!disabled) {
        onChange(!value);
      }
    };

    // Interpolate colors and positions
    const trackColor = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.surfaceVariant, colors.primary],
    });

    const thumbColor = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.outline, colors.onPrimary],
    });

    const trackBorderColor = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.outline, colors.primary],
    });

    const thumbPosition = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [4, 24], // Track width is 52, thumb is 24/32, padding is 4
    });

    const thumbSize = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 24],
    });

    const thumbMargin = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [4, 0], // Center 16px thumb in 24px space when off
    });

    return (
      <Pressable
        ref={ref as any}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          opacity: disabled ? 0.38 : 1,
          minHeight: 48, // 48dp minimum touch target
        }}
      >
        <Animated.View
          style={{
            width: 52,
            height: 32,
            borderRadius: 16,
            backgroundColor: trackColor,
            borderWidth: 2,
            borderColor: trackBorderColor,
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              width: thumbSize,
              height: thumbSize,
              borderRadius: 16,
              backgroundColor: thumbColor,
              transform: [{ translateX: thumbPosition }],
              marginTop: thumbMargin,
              marginBottom: thumbMargin,
            }}
          />
        </Animated.View>
        {label && (
          <Text style={{ color: colors.onSurface, fontSize: 16, marginLeft: spacing.md }}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);

Switch.displayName = 'Switch';
export default Switch;
