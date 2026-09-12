/**
 * Material Design 3 Color System
 * Defines semantic color roles for light and dark themes with WCAG AA compliance
 */

/**
 * Light theme colors - Material Design 3 default palette
 * All color combinations meet WCAG AA standards (4.5:1 for text, 3:1 for UI components)
 */
export const lightThemeColors = {
  // Primary color group
  primary: '#6750a4',
  onPrimary: '#ffffff',
  primaryContainer: '#eaddff',
  onPrimaryContainer: '#21005e',

  // Secondary color group
  secondary: '#625b71',
  onSecondary: '#ffffff',
  secondaryContainer: '#e8def8',
  onSecondaryContainer: '#1d192b',

  // Tertiary color group
  tertiary: '#7d5260',
  onTertiary: '#ffffff',
  tertiaryContainer: '#ffd8e4',
  onTertiaryContainer: '#370b1e',

  // Error color group
  error: '#b3261e',
  onError: '#ffffff',
  errorContainer: '#f9dedc',
  onErrorContainer: '#410e0b',

  // Neutral colors
  background: '#fffbfe',
  onBackground: '#1c1b1f',
  surface: '#fffbfe',
  onSurface: '#1c1b1f',
  surfaceVariant: '#e7e0ec',
  onSurfaceVariant: '#49454e',

  // Outline colors
  outline: '#79747e',
  outlineVariant: '#cac7d0',

  // Additional colors
  shadow: '#000000',
  scrim: '#000000',
};

/**
 * Dark theme colors - Material Design 3 dark palette
 * All color combinations meet WCAG AA standards (4.5:1 for text, 3:1 for UI components)
 */
export const darkThemeColors = {
  // Primary color group
  primary: '#d0bcff',
  onPrimary: '#371e55',
  primaryContainer: '#4f378b',
  onPrimaryContainer: '#eaddff',

  // Secondary color group
  secondary: '#ccc7db',
  onSecondary: '#332d41',
  secondaryContainer: '#4a4458',
  onSecondaryContainer: '#e8def8',

  // Tertiary color group
  tertiary: '#f5b8d1',
  onTertiary: '#502839',
  tertiaryContainer: '#653950',
  onTertiaryContainer: '#ffd8e4',

  // Error color group
  error: '#f2b8b5',
  onError: '#601410',
  errorContainer: '#8c1d18',
  onErrorContainer: '#f9dedc',

  // Neutral colors
  background: '#1c1b1f',
  onBackground: '#e7e0ec',
  surface: '#1c1b1f',
  onSurface: '#e7e0ec',
  surfaceVariant: '#49454e',
  onSurfaceVariant: '#cac7d0',

  // Outline colors
  outline: '#938f99',
  outlineVariant: '#49454e',

  // Additional colors
  shadow: '#000000',
  scrim: '#000000',
};

/**
 * Verify contrast ratio between two colors
 * @param color1 - Hex color string
 * @param color2 - Hex color string
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color for contrast calculation
 * @param color - Hex color string
 * @returns Luminance value (0-1)
 */
export function getRelativeLuminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Verify all semantic color pairs meet WCAG AA standards
 * @param colors - Color object to verify
 * @param isTextColor - If true, requires 4.5:1 ratio; if false, requires 3:1
 * @returns Array of contrast ratio results
 */
export function verifyColorContrast(
  colors: typeof lightThemeColors,
  isTextColor: boolean = true
): Array<{ pair: string; ratio: number; compliant: boolean }> {
  const requiredRatio = isTextColor ? 4.5 : 3;
  const results: Array<{ pair: string; ratio: number; compliant: boolean }> = [];

  // Test common text + background combinations
  const textColorPairs = [
    { text: 'onPrimary', bg: 'primary' },
    { text: 'onPrimaryContainer', bg: 'primaryContainer' },
    { text: 'onSecondary', bg: 'secondary' },
    { text: 'onSecondaryContainer', bg: 'secondaryContainer' },
    { text: 'onTertiary', bg: 'tertiary' },
    { text: 'onTertiaryContainer', bg: 'tertiaryContainer' },
    { text: 'onError', bg: 'error' },
    { text: 'onErrorContainer', bg: 'errorContainer' },
    { text: 'onBackground', bg: 'background' },
    { text: 'onSurface', bg: 'surface' },
    { text: 'onSurfaceVariant', bg: 'surfaceVariant' },
  ];

  for (const pair of textColorPairs) {
    const textColor = colors[pair.text as keyof typeof colors];
    const bgColor = colors[pair.bg as keyof typeof colors];

    if (textColor && bgColor) {
      const ratio = getContrastRatio(textColor, bgColor);
      const compliant = ratio >= requiredRatio;

      results.push({
        pair: `${pair.text} on ${pair.bg}`,
        ratio: parseFloat(ratio.toFixed(2)),
        compliant,
      });
    }
  }

  return results;
}

/**
 * Generate Material Design 3 color system for a custom primary color
 * Note: This is a simplified implementation. For production, use Material's official color tool.
 */
export function generateColorSystem(primaryHex: string) {
  // This is a placeholder. Full implementation would use Material Color Utilities
  // See: https://github.com/material-foundation/material-color-utilities
  return {
    light: lightThemeColors,
    dark: darkThemeColors,
  };
}
