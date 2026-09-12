/**
 * Material Design 3 Theme Provider
 * Provides theme context to all components with light/dark mode support
 */

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  ThemeContext as ThemeContextType,
  ThemeTokens,
} from '../types/component';
import {
  lightThemeColors,
  darkThemeColors,
} from './colors';
import { typographyScales, spacingScale } from './typography';

/**
 * Create theme context
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialDark?: boolean;
}

/**
 * Create theme tokens object from colors and typography
 */
function createThemeTokens(colors: typeof lightThemeColors): ThemeTokens {
  return {
    colors,
    typography: typographyScales,
    spacing: spacingScale,
    elevation: {
      0: { elevation: 0 },
      1: { elevation: 1 },
      2: { elevation: 2 },
      3: { elevation: 3 },
      4: { elevation: 4 },
      5: { elevation: 5 },
    },
    touchTargetSize: 48,
  };
}

/**
 * Theme Provider Component
 * Wraps the app and provides theme context to all children
 */
export function ThemeProvider({ children, initialDark }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(
    initialDark ?? systemColorScheme === 'dark'
  );
  const [customTokens, setCustomTokensState] = useState<Partial<ThemeTokens> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme_mode');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
      setIsLoaded(true);
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
      setIsLoaded(true);
    }
  };

  const toggleDarkMode = useCallback(async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    // Persist to storage
    try {
      await AsyncStorage.setItem('@theme_mode', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, [isDark]);

  const setCustomTokens = useCallback((tokens: Partial<ThemeTokens>) => {
    setCustomTokensState(tokens);
  }, []);

  if (!isLoaded) {
    // Render placeholder while loading theme preference
    return <>{children}</>;
  }

  // Get colors based on theme
  const colors = isDark ? darkThemeColors : lightThemeColors;

  // Create base tokens
  const baseTokens = createThemeTokens(colors);

  // Merge custom tokens if provided
  const finalTokens: ThemeTokens = customTokens
    ? {
        ...baseTokens,
        ...customTokens,
        colors: { ...baseTokens.colors, ...customTokens.colors },
      }
    : baseTokens;

  const themeContext: ThemeContextType = {
    tokens: finalTokens,
    isDark,
    toggleDarkMode,
    setCustomTokens,
  };

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}
