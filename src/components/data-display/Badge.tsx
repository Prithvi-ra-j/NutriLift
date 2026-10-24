import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface BadgeProps {
  children?: React.ReactNode;
  visible?: boolean;
  variant?: 'standard' | 'dot';
  content?: string | number;
  max?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: string;
  textColor?: string;
}

/**
 * Material Design 3 Badge Component
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  visible = true,
  variant = 'standard',
  content,
  max = 99,
  position = 'top-right',
  color,
  textColor,
}) => {
  const { tokens } = useTheme();
  const themeColors = tokens.colors;
  const typography = tokens.typography;

  const backgroundColor = color || themeColors.error;
  const contentColor = textColor || themeColors.onError;

  const displayContent = useMemo(() => {
    if (variant === 'dot') return null;
    if (typeof content === 'number' && content > max) {
      return `${max}+`;
    }
    return content;
  }, [variant, content, max]);

  const styles = useMemo(() => {
    const isDot = variant === 'dot';
    
    const offset = isDot ? -2 : -4;
    const badgePositions: Record<NonNullable<BadgeProps['position']>, ViewStyle> = {
      'top-right': { top: offset, right: offset },
      'top-left': { top: offset, left: offset },
      'bottom-right': { bottom: offset, right: offset },
      'bottom-left': { bottom: offset, left: offset },
    };

    const badgeStyle: ViewStyle = {
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      ...(isDot
        ? { width: 6, height: 6, borderRadius: 3 }
        : { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4 }),
      ...(children ? { position: 'absolute', ...badgePositions[position] } : {}),
    };

    const textStyle: TextStyle = {
      ...typography.label.small,
      color: contentColor,
      fontSize: 11,
      lineHeight: 14,
    };

    return {
      container: {
        alignSelf: 'flex-start',
      } as ViewStyle,
      badge: badgeStyle,
      text: textStyle,
    };
  }, [backgroundColor, contentColor, variant, position, children, typography]);

  if (!children && !visible) return null;

  const renderBadge = () => {
    if (!visible) return null;
    return (
      <View style={styles.badge} accessibilityRole="summary">
        {variant === 'standard' && displayContent != null && (
          <Text style={styles.text} numberOfLines={1}>
            {displayContent}
          </Text>
        )}
      </View>
    );
  };

  if (!children) {
    return renderBadge();
  }

  return (
    <View style={styles.container}>
      {children}
      {renderBadge()}
    </View>
  );
};

Badge.displayName = 'Badge';

export default Badge;
