import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { TextProps } from '../../core/types/component';
import { getTypographyStyle } from '../../core/theme/typography';

export const Typography = React.forwardRef<RNText, TextProps>(
  ({ variant = 'body-medium', color, weight, style, children, ...props }, ref) => {
    const { tokens } = useTheme();
    const colors = tokens.colors;

    // Resolve variant style
    const variantStyle = getTypographyStyle(variant);

    // Resolve color
    let textColor = colors.onBackground;
    if (color) {
      if (color === 'primary') textColor = colors.primary;
      else if (color === 'secondary') textColor = colors.secondary;
      else if (color === 'error') textColor = colors.error;
      else if (color === 'on-surface') textColor = colors.onSurface;
      else textColor = color; // custom color
    }

    // Resolve font weight
    const fontWeight = weight === 'light' ? '300' :
                       weight === 'regular' ? '400' :
                       weight === 'medium' ? '500' :
                       weight === 'bold' ? '700' : undefined;

    const computedStyle: TextStyle = {
      ...variantStyle,
      color: textColor,
      ...(fontWeight ? { fontWeight } : {}),
      ...(style ? (StyleSheet.flatten(style) as TextStyle) : {}),
    };

    return (
      <RNText ref={ref} style={computedStyle} {...props}>
        {children}
      </RNText>
    );
  }
);

Typography.displayName = 'Typography';
export default Typography;
