// @ts-nocheck
import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import { lightThemeColors, darkThemeColors } from './colors';

// Helper component to test useTheme hook
const ThemeConsumer = () => {
  const { isDark, toggleDarkMode, tokens, setCustomTokens } = useTheme();
  return (
    <View>
      <Text testID="mode">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="primary-color">{tokens.colors.primary}</Text>
      <Pressable testID="toggle" onPress={toggleDarkMode} />
      <Pressable 
        testID="set-custom" 
        onPress={() => setCustomTokens({ colors: { primary: '#FF0000' } })} 
      />
    </View>
  );
};

describe('ThemeProvider & useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children with default theme', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Initial render is placeholder until loaded
    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light'); // Assuming system is light by default in test
      expect(getByTestId('primary-color').props.children).toBe(lightThemeColors.primary);
    });
  });

  it('toggles dark mode and persists to AsyncStorage', async () => {
    const { getByTestId } = render(
      <ThemeProvider initialDark={false}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('light');
    });

    await act(async () => {
      fireEvent.press(getByTestId('toggle'));
    });

    expect(getByTestId('mode').props.children).toBe('dark');
    expect(getByTestId('primary-color').props.children).toBe(darkThemeColors.primary);
    
    // Verify persistence
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@theme_mode', 'dark');
  });

  it('loads theme preference from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('dark');
      expect(getByTestId('primary-color').props.children).toBe(darkThemeColors.primary);
    });
    
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@theme_mode');
  });

  it('allows overriding custom tokens', async () => {
    const { getByTestId } = render(
      <ThemeProvider initialDark={false}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('primary-color').props.children).toBe(lightThemeColors.primary);
    });

    await act(async () => {
      fireEvent.press(getByTestId('set-custom'));
    });

    expect(getByTestId('primary-color').props.children).toBe('#FF0000');
  });

  it('throws error when useTheme is called outside ThemeProvider', () => {
    // Suppress console.error for expected throw
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    console.error = originalError;
  });
});
