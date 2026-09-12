/**
 * useTheme Hook
 * Access theme context from any component in the component tree
 */

import { useContext } from 'react';
import { ThemeContext } from '../core/theme/ThemeProvider';
import { ThemeContext as ThemeContextType } from '../core/types/component';

/**
 * Hook to access the theme context
 * @throws Error if ThemeProvider is not found in component tree
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Make sure to wrap your app with <ThemeProvider> at the root.'
    );
  }

  return context as ThemeContextType;
}

/**
 * Hook to access only the theme tokens
 */
export function useThemeTokens() {
  const { tokens } = useTheme();
  return tokens;
}

/**
 * Hook to access only the color tokens
 */
export function useColors() {
  const { tokens } = useTheme();
  return tokens.colors;
}

/**
 * Hook to access only the typography scales
 */
export function useTypography() {
  const { tokens } = useTheme();
  return tokens.typography;
}

/**
 * Hook to access only the spacing scale
 */
export function useSpacing() {
  const { tokens } = useTheme();
  return tokens.spacing;
}

/**
 * Hook to toggle dark mode
 */
export function useDarkMode() {
  const { isDark, toggleDarkMode } = useTheme();
  return { isDark, toggleDarkMode };
}
