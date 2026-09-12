/**
 * Material Design 3 Typography System
 * Defines all typography scales and their styling properties
 */

import { TextStyle } from 'react-native';

/**
 * Material Design 3 typography scales
 * Includes display, headline, title, body, and label scales with size variants
 */
export const typographyScales = {
  display: {
    large: {
      fontSize: 57,
      fontWeight: '400',
      lineHeight: 64,
      letterSpacing: 0,
    } as TextStyle,
    medium: {
      fontSize: 45,
      fontWeight: '400',
      lineHeight: 52,
      letterSpacing: 0,
    } as TextStyle,
    small: {
      fontSize: 36,
      fontWeight: '400',
      lineHeight: 44,
      letterSpacing: 0,
    } as TextStyle,
  },
  headline: {
    large: {
      fontSize: 32,
      fontWeight: '400',
      lineHeight: 40,
      letterSpacing: 0,
    } as TextStyle,
    medium: {
      fontSize: 28,
      fontWeight: '400',
      lineHeight: 36,
      letterSpacing: 0,
    } as TextStyle,
    small: {
      fontSize: 24,
      fontWeight: '400',
      lineHeight: 32,
      letterSpacing: 0,
    } as TextStyle,
  },
  title: {
    large: {
      fontSize: 22,
      fontWeight: '500',
      lineHeight: 28,
      letterSpacing: 0,
    } as TextStyle,
    medium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      letterSpacing: 0.15,
    } as TextStyle,
    small: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0.1,
    } as TextStyle,
  },
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0.5,
    } as TextStyle,
    medium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      letterSpacing: 0.25,
    } as TextStyle,
    small: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0.4,
    } as TextStyle,
  },
  label: {
    large: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0.1,
    } as TextStyle,
    medium: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.5,
    } as TextStyle,
    small: {
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 0.5,
    } as TextStyle,
  },
};

/**
 * Map typography variant names to their styles
 */
export function getTypographyStyle(
  variant:
    | 'display-large'
    | 'display-medium'
    | 'display-small'
    | 'headline-large'
    | 'headline-medium'
    | 'headline-small'
    | 'title-large'
    | 'title-medium'
    | 'title-small'
    | 'body-large'
    | 'body-medium'
    | 'body-small'
    | 'label-large'
    | 'label-medium'
    | 'label-small'
): TextStyle {
  const [scale, size] = variant.split('-') as [
    'display' | 'headline' | 'title' | 'body' | 'label',
    'large' | 'medium' | 'small'
  ];

  return typographyScales[scale][size];
}

/**
 * Spacing scale for consistent layouts
 * Based on Material Design 3 4dp base unit
 */
export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/**
 * Font weights used in Material Design 3
 */
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Combine typography style with custom overrides
 */
export function createTextStyle(
  variant: ReturnType<typeof getTypographyStyle>,
  overrides?: Partial<TextStyle>
): TextStyle {
  return {
    ...variant,
    ...overrides,
  };
}
