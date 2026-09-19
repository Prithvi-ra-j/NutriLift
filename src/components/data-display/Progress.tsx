import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ProgressProps {
  variant?: 'linear' | 'circular';
  value?: number; // 0 to 1 for determinate
  indeterminate?: boolean;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  trackColor?: string;
  size?: number; // for circular
  thickness?: number; // for circular
}

/**
 * Material Design 3 Progress Component
 */
export const Progress: React.FC<ProgressProps> = ({
  variant = 'linear',
  value = 0,
  indeterminate = false,
  label,
  showPercentage = false,
  color,
  trackColor,
  size = 40,
  thickness = 4,
}) => {
  const { tokens } = useTheme();
  const themeColors = tokens.colors;
  const typography = tokens.typography;

  const activeColor = color || themeColors.primary;
  const inactiveColor = trackColor || themeColors.surfaceVariant;

  const animatedValue = useRef(new Animated.Value(indeterminate ? 0 : value)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (indeterminate) {
      // Indeterminate animation
      const anim = Animated.loop(
        Animated.parallel([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(rotation, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true, // true if circular (transform rotation)
          })
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      // Determinate animation
      Animated.timing(animatedValue, {
        toValue: Math.max(0, Math.min(1, value)),
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [value, indeterminate, animatedValue, rotation]);

  const styles = useMemo(() => {
    return {
      container: {
        alignItems: variant === 'circular' ? 'center' : 'stretch',
        justifyContent: 'center',
        paddingVertical: 8,
      } as ViewStyle,
      linearTrack: {
        height: 4,
        backgroundColor: inactiveColor,
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
      } as ViewStyle,
      labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
      } as ViewStyle,
      labelText: {
        ...typography.label.large,
        color: themeColors.onSurface,
      } as TextStyle,
    };
  }, [variant, inactiveColor, themeColors, typography]);

  const renderLinear = () => {
    const width = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    const left = indeterminate
      ? animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['-100%', '100%'],
        })
      : '0%';

    return (
      <View style={styles.linearTrack}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: activeColor,
            width: indeterminate ? '50%' : width,
            left: left as any,
          }}
        />
      </View>
    );
  };

  const renderCircular = () => {
    // For a true circular progress in RN without SVG, we usually use borders and rotation.
    // For simplicity, a basic spinner using half-borders
    const spin = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: inactiveColor,
          borderTopColor: activeColor,
          transform: [{ rotate: spin }],
        }}
      />
    );
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessible
      accessibilityValue={!indeterminate ? { min: 0, max: 100, now: value * 100 } : {}}
      accessibilityLabel={label || 'Progress'}
    >
      {(label || showPercentage) && variant === 'linear' && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.labelText}>{label}</Text>}
          {showPercentage && !indeterminate && (
            <Text style={styles.labelText}>{`${Math.round(value * 100)}%`}</Text>
          )}
        </View>
      )}
      
      {variant === 'linear' ? renderLinear() : renderCircular()}
      
      {(label || showPercentage) && variant === 'circular' && (
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          {label && <Text style={styles.labelText}>{label}</Text>}
          {showPercentage && !indeterminate && (
            <Text style={styles.labelText}>{`${Math.round(value * 100)}%`}</Text>
          )}
        </View>
      )}
    </View>
  );
};

Progress.displayName = 'Progress';

export default Progress;
