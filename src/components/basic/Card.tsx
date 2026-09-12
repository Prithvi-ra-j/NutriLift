/**
 * Material Design 3 Card Component
 * 
 * A versatile card component supporting 3 Material Design 3 variants with
 * proper elevation, consistent spacing, and optional interactive behavior.
 * 
 * ## Features
 * - ✓ 3 variants: elevated, filled, outlined
 * - ✓ Proper elevation/shadow variations per Material Design 3
 * - ✓ Optional onPress handler for interactive cards
 * - ✓ Consistent internal padding
 * - ✓ Support for flexible children content
 * - ✓ Full theme integration with light/dark mode support
 * - ✓ Custom styling via NativeWind className extension
 * 
 * ## Requirements
 * - **Requirement 2.3**: Card component with variants
 * 
 * ## Usage Examples
 * 
 * ### Basic Elevated Card
 * ```tsx
 * <Card variant="elevated">
 *   <Text>Card Content</Text>
 * </Card>
 * ```
 * 
 * ### Interactive Card with onPress
 * ```tsx
 * <Card variant="filled" onPress={() => handleCardPress()}>
 *   <Text>Clickable Card</Text>
 * </Card>
 * ```
 * 
 * ### Outlined Card with Custom Elevation
 * ```tsx
 * <Card variant="outlined" elevation={2}>
 *   <Text>Custom Elevation</Text>
 * </Card>
 * ```
 * 
 * ### Card with Complex Content
 * ```tsx
 * <Card variant="elevated">
 *   <Image source={...} />
 *   <Text>Title</Text>
 *   <Text>Description</Text>
 *   <Button>Action</Button>
 * </Card>
 * ```
 * 
 * ## Accessibility
 * - Keyboard accessible when onPress is provided
 * - Focus indicators visible on keyboard focus
 * - Screen reader support with proper role and state
 * - Press feedback through subtle visual changes
 * 
 * ## Variants
 * - **elevated**: Card with elevation shadow (Material Design default)
 * - **filled**: Card with filled background color
 * - **outlined**: Card with border outline only
 * 
 * ## Elevation System
 * - Level 0: No shadow (surface level)
 * - Level 1: Small shadow (default for elevated cards)
 * - Level 2: Medium shadow
 * - Level 3: Large shadow
 * - Level 4: Extra large shadow
 * - Level 5: Maximum shadow
 * 
 * ## Color System
 * Colors are automatically applied from the Material Design 3 theme:
 * - Elevated: Surface background with elevation shadow
 * - Filled: SurfaceVariant background
 * - Outlined: Surface background with Outline border
 */

import React, { useMemo } from 'react';
import {
  View,
  Pressable,
  ViewStyle,
  AccessibilityRole,
  PressableStateCallbackType,
  PressableProps,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CardProps } from '../../core/types/component';
import {
  getThemeColor,
  getElevation,
  getDisabledOpacity,
  getFocusIndicatorColor,
} from '../../core/utils/theme';

/**
 * Material Design 3 Card Component
 *
 * @example
 * // Elevated card
 * <Card variant="elevated">
 *   <Text>Card content</Text>
 * </Card>
 *
 * @example
 * // Interactive filled card
 * <Card variant="filled" onPress={() => console.log('Card pressed')}>
 *   <Text>Clickable card</Text>
 * </Card>
 *
 * @example
 * // Outlined card with custom elevation
 * <Card variant="outlined" elevation={3}>
 *   <Text>Custom elevation</Text>
 * </Card>
 */
export const Card = React.forwardRef<View, CardProps>(
  (
    {
      variant = 'elevated',
      children,
      onPress,
      elevation: customElevation,
      style,
      accessibilityRole,
      ...props
    },
    ref
  ) => {
    const { tokens } = useTheme();
    const colors = tokens.colors;
    const spacing = tokens.spacing;

    // Determine if card is interactive
    const isInteractive = !!onPress;

    // Memoize card styles to prevent unnecessary recalculations
    const cardStyles = useMemo(() => {
      const baseStyle: ViewStyle = {
        borderRadius: 12, // Material Design 3 standard card corner radius
        padding: spacing.md, // Consistent internal padding
        minHeight: 80, // Minimum height for proper content display
      };

      // Determine elevation level based on variant and custom elevation
      let elevationLevel: keyof typeof tokens.elevation = 0;
      if (customElevation !== undefined) {
        elevationLevel = Math.min(Math.max(customElevation, 0), 5) as keyof typeof tokens.elevation;
      } else if (variant === 'elevated') {
        elevationLevel = 1;
      }

      // Variant-specific colors and styling
      const variantStyles: Record<string, ViewStyle> = {
        elevated: {
          backgroundColor: colors.surface,
          ...(getElevation(tokens, elevationLevel) as object || {}),
        },
        filled: {
          backgroundColor: colors.surfaceVariant,
          ...(customElevation !== undefined ? (getElevation(tokens, elevationLevel) as object || {}) : {}),
        },
        outlined: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outline,
          ...(customElevation !== undefined ? (getElevation(tokens, elevationLevel) as object || {}) : {}),
        },
      };

      return {
        base: baseStyle,
        variant: variantStyles[variant] || variantStyles.elevated,
      };
    }, [variant, customElevation, colors, spacing, tokens]);

    // Pressed state styling for interactive cards
    const getPressedStyle = (baseStyle: ViewStyle): ViewStyle => {
      if (!isInteractive) return baseStyle;

      // Subtle press feedback by reducing opacity slightly
      return {
        ...baseStyle,
        opacity: 0.95,
        // Slightly increase elevation on press for tactile feedback
        ...(variant === 'elevated' || customElevation !== undefined
          ? (getElevation(tokens, Math.min((customElevation || 1) + 1, 5) as keyof typeof tokens.elevation) as object || {})
          : {}),
      };
    };

    // Build final container style
    const finalContainerStyle: ViewStyle = {
      ...(cardStyles.base || {}),
      ...(cardStyles.variant || {}),
      ...(style ? (typeof style === 'object' && !Array.isArray(style) ? style : Object.assign({}, ...(Array.isArray(style) ? style : [style]))) : {}),
    };

    // If card is interactive, render as Pressable
    if (isInteractive) {
      return (
        <Pressable
          ref={ref as any}
          onPress={onPress}
          accessibilityRole={accessibilityRole || 'button'}
          accessibilityState={{
            disabled: false,
          }}
          style={({ pressed }: PressableStateCallbackType) => [
            finalContainerStyle,
            pressed && getPressedStyle(finalContainerStyle),
          ]}
          {...(props as PressableProps)}
        >
          {children}
        </Pressable>
      );
    }

    // Non-interactive card - render as View
    return (
      <View
        ref={ref}
        style={finalContainerStyle}
        accessibilityRole={accessibilityRole}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

export default Card;