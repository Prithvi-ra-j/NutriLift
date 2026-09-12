import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Animated,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { TextFieldProps } from '../../core/types/component';
import { getThemeColor } from '../../core/utils/theme';

export const TextField = React.forwardRef<TextInput, TextFieldProps>(
  (
    {
      variant = 'filled',
      label,
      helper,
      error,
      leading,
      trailing,
      multiline = false,
      style,
      onFocus,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const { tokens } = useTheme();
    const colors = tokens.colors;
    const spacing = tokens.spacing;

    const [isFocused, setIsFocused] = useState(false);
    
    // Label animation
    const hasValue = value !== undefined && value !== '' || props.defaultValue;
    const isFloating = isFocused || hasValue;
    
    const floatAnim = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(floatAnim, {
        toValue: isFloating ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }, [isFloating, floatAnim]);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const hasError = !!error;
    const errorColor = colors.error;
    const focusColor = colors.primary;
    const activeColor = hasError ? errorColor : isFocused ? focusColor : colors.outline;

    // Container styles
    const containerStyle = useMemo<ViewStyle>(() => {
      const base: ViewStyle = {
        minHeight: multiline ? 80 : 56,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
        paddingVertical: multiline ? spacing.md : 0,
      };

      if (variant === 'filled') {
        return {
          ...base,
          backgroundColor: colors.surfaceVariant,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          borderBottomWidth: isFocused ? 2 : 1,
          borderBottomColor: activeColor,
        };
      }

      // Outlined
      return {
        ...base,
        backgroundColor: 'transparent',
        borderRadius: 4,
        borderWidth: isFocused ? 2 : 1,
        borderColor: activeColor,
      };
    }, [variant, isFocused, activeColor, colors, spacing, multiline]);

    // Label animation styles
    const labelStyle = useMemo(() => {
      const topAnim = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [multiline ? spacing.md : 18, variant === 'filled' ? 8 : -10],
      });
      const fontSizeAnim = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 12],
      });
      const colorAnim = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.onSurfaceVariant, activeColor],
      });

      return {
        position: 'absolute' as const,
        left: leading ? spacing.xl + spacing.md : spacing.md,
        top: topAnim,
        fontSize: fontSizeAnim,
        color: colorAnim,
        backgroundColor: variant === 'outlined' && isFloating ? colors.surface : 'transparent',
        paddingHorizontal: variant === 'outlined' && isFloating ? 4 : 0,
        zIndex: 1,
      };
    }, [floatAnim, multiline, variant, leading, spacing, activeColor, colors, isFloating]);

    return (
      <View style={style as any}>
        <View style={containerStyle}>
          {leading && (
            <View style={{ marginRight: spacing.sm, paddingTop: multiline ? 2 : 0 }}>
              {leading}
            </View>
          )}

          <View style={{ flex: 1, position: 'relative' }}>
            {label && (
              <Animated.Text style={labelStyle as any}>
                {label}
              </Animated.Text>
            )}
            <TextInput
              ref={ref}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              multiline={multiline}
              style={{
                flex: 1,
                color: colors.onSurface,
                fontSize: 16,
                paddingTop: variant === 'filled' && label ? 20 : (multiline ? 0 : 0),
                paddingBottom: variant === 'filled' && label ? 4 : 0,
                minHeight: multiline ? 60 : undefined,
                textAlignVertical: multiline ? 'top' : 'center',
              }}
              placeholderTextColor={colors.onSurfaceVariant}
              {...props}
            />
          </View>

          {trailing && (
            <View style={{ marginLeft: spacing.sm, paddingTop: multiline ? 2 : 0 }}>
              {trailing}
            </View>
          )}
        </View>
        
        {/* Helper or Error Text */}
        {(helper || error) && (
          <Text
            style={{
              color: hasError ? colors.error : colors.onSurfaceVariant,
              fontSize: 12,
              marginTop: 4,
              paddingHorizontal: spacing.md,
            }}
          >
            {typeof error === 'string' ? error : helper}
          </Text>
        )}
      </View>
    );
  }
);

TextField.displayName = 'TextField';
export default TextField;
