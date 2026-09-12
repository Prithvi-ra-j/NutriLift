// @ts-nocheck
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import { lightThemeColors, darkThemeColors } from './colors';
import { typographyScales } from './typography';

const DeepNestedComponent = () => {
  const { tokens } = useTheme();
  return (
    <View style={{ backgroundColor: tokens.colors.surface }}>
      <Text style={tokens.typography.body.large} testID="nested-text">
        Nested
      </Text>
    </View>
  );
};

const ThemeController = ({ onThemeExtracted }) => {
  const theme = useTheme();
  React.useEffect(() => {
    if (onThemeExtracted) {
      onThemeExtracted(theme);
    }
  }, [theme]);
  return <DeepNestedComponent />;
};

describe('Theme System Property Tests', () => {
  describe('Property 1: Theme Token Consistency', () => {
    it('provides consistent token access throughout the tree', async () => {
      let extractedTheme = null;
      
      render(
        <ThemeProvider initialDark={false}>
          <ThemeController onThemeExtracted={(t) => { extractedTheme = t; }} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(extractedTheme).not.toBeNull();
      });

      // Assert basic shape
      expect(extractedTheme.tokens).toBeDefined();
      expect(extractedTheme.tokens.colors).toBeDefined();
      expect(extractedTheme.tokens.typography).toBeDefined();
      expect(extractedTheme.tokens.spacing).toBeDefined();
      
      // Assert specific tokens match expected source of truth
      expect(extractedTheme.tokens.colors.primary).toBe(lightThemeColors.primary);
      expect(extractedTheme.tokens.typography.body.large).toEqual(typographyScales.body.large);
    });
  });

  describe('Property 7: Theme Dynamic Switching', () => {
    it('updates all components simultaneously when theme changes', async () => {
      let extractedTheme = null;
      
      const { getByTestId, rerender } = render(
        <ThemeProvider initialDark={false}>
          <ThemeController onThemeExtracted={(t) => { extractedTheme = t; }} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(extractedTheme.isDark).toBe(false);
      });

      // Switch theme
      await act(async () => {
        extractedTheme.toggleDarkMode();
      });

      // Re-verify extracted theme
      expect(extractedTheme.isDark).toBe(true);
      expect(extractedTheme.tokens.colors.primary).toBe(darkThemeColors.primary);
      expect(extractedTheme.tokens.colors.surface).toBe(darkThemeColors.surface);
    });
  });
});
