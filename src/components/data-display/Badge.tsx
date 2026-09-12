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
    
    const badgeStyle: ViewStyle = {
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    };

    if (isDot) {
      badgeStyle.width = 6;
      badgeStyle.height = 6;
      badgeStyle.borderRadius = 3;
    } else {
      badgeStyle.minWidth = 16;
      badgeStyle.height = 16;
      badgeStyle.borderRadius = 8;
      badgeStyle.paddingHorizontal = 4;
    }

    if (children) {
      badgeStyle.position = 'absolute';
      const offset = isDot ? -2 : -4;
      
      switch (position) {
        case 'top-right':
          badgeStyle.top = offset;
          badgeStyle.right = offset;
          break;
        case 'top-left':
          badgeStyle.top = offset;
          badgeStyle.left = offset;
          break;
        case 'bottom-right':
          badgeStyle.bottom = offset;
          badgeStyle.right = offset;
          break;
        case 'bottom-left':
          badgeStyle.bottom = offset;
          badgeStyle.left = offset;
          break;
      }
    }

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
