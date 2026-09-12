/**
 * Theme Utilities
 * Helper functions for working with theme tokens
 */

import { ThemeTokens } from '../types/component';
import { getTypographyStyle } from '../theme/typography';

/**
 * Get a specific color from the theme
 */
export function getThemeColor(
  tokens: ThemeTokens,
  colorKey: keyof ThemeTokens['colors']
): string {
  return tokens.colors[colorKey];
}

/**
 * Get a specific typography style from the theme
 */
export function getThemeTypography(
  tokens: ThemeTokens,
  variant: ReturnType<typeof getTypographyStyle>
) {
  return variant;
}

/**
 * Get spacing value from theme
 */
export function getSpacing(
  tokens: ThemeTokens,
  size: keyof ThemeTokens['spacing']
): number {
  return tokens.spacing[size];
}

/**
 * Get elevation style from theme
 */
export function getElevation(
  tokens: ThemeTokens,
  level: keyof ThemeTokens['elevation']
) {
  return tokens.elevation[level];
}

/**
 * Create component style object from theme tokens
 */
export function createComponentStyle(
  tokens: ThemeTokens,
  overrides?: Record<string, any>
) {
  return {
    ...overrides,
  };
}

/**
 * Map theme semantic colors to style props
 */
export interface SemanticColorMap {
  text?: keyof ThemeTokens['colors'];
  background?: keyof ThemeTokens['colors'];
  border?: keyof ThemeTokens['colors'];
}

export function mapSemanticColors(
  tokens: ThemeTokens,
  semanticMap: SemanticColorMap
): Record<string, string> {
  return {
    ...(semanticMap.text && { color: getThemeColor(tokens, semanticMap.text) }),
    ...(semanticMap.background && {
      backgroundColor: getThemeColor(tokens, semanticMap.background),
    }),
    ...(semanticMap.border && {
      borderColor: getThemeColor(tokens, semanticMap.border),
    }),
  };
}

/**
 * Get focus indicator color based on theme
 */
export function getFocusIndicatorColor(tokens: ThemeTokens): string {
  return getThemeColor(tokens, 'primary');
}

/**
 * Get disabled opacity for theme
 */
export function getDisabledOpacity(tokens: ThemeTokens): number {
  return 0.38; // Material Design 3 standard
}

/**
 * Create ripple/press feedback color based on theme
 */
export function getPressedStateColor(tokens: ThemeTokens, baseColor: string): string {
  // Simplified: would normally blend/adjust the base color
  return baseColor;
}

/**
 * Validate theme token structure
 */
export function validateThemeTokens(tokens: ThemeTokens): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate colors exist
  if (!tokens.colors) {
    errors.push('Missing colors object');
  } else {
    const requiredColors = [
      'primary',
      'onPrimary',
      'secondary',
      'onSecondary',
      'background',
      'onBackground',
      'surface',
      'onSurface',
      'error',
      'onError',
    ];

    for (const color of requiredColors) {
      if (!tokens.colors[color as keyof typeof tokens.colors]) {
        errors.push(`Missing required color: ${color}`);
      }
    }
  }

  // Validate typography exists
  if (!tokens.typography) {
    errors.push('Missing typography object');
  }

  // Validate spacing exists
  if (!tokens.spacing) {
    errors.push('Missing spacing object');
  }

  // Validate elevation exists
  if (!tokens.elevation) {
    errors.push('Missing elevation object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge theme tokens with defaults
 */
export function mergeThemeTokens(
  defaultTokens: ThemeTokens,
  customTokens: Partial<ThemeTokens>
): ThemeTokens {
  return {
    ...defaultTokens,
    colors: { ...defaultTokens.colors, ...customTokens.colors },
    typography: customTokens.typography || defaultTokens.typography,
    spacing: { ...defaultTokens.spacing, ...customTokens.spacing },
    elevation: { ...defaultTokens.elevation, ...customTokens.elevation },
    touchTargetSize: customTokens.touchTargetSize || defaultTokens.touchTargetSize,
  };
}
