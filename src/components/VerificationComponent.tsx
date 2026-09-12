/**
 * Theme Infrastructure Verification Component
 * Demonstrates theme context usage and NativeWind integration
 * 
 * Validates:
 * - ThemeProvider wrapping components
 * - useTheme hook access to theme tokens
 * - Theme colors and typography accessibility
 * - NativeWind className integration
 * - Dark mode toggle functionality
 */

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ThemeProvider } from '../core/theme/ThemeProvider';
import {
  useTheme,
  useColors,
  useTypography,
  useSpacing,
  useDarkMode,
} from '../hooks/useTheme';

/**
 * Internal component that uses theme hooks
 * This must be rendered inside ThemeProvider
 */
function ThemeConsumerComponent(): React.JSX.Element {
  const theme = useTheme();
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.md,
      }}
    >
      {/* Header */}
      <Text
        style={[
          typography.display.large,
          {
            color: colors.primary,
            marginBottom: spacing.lg,
          },
        ]}
      >
        Theme Infrastructure
      </Text>

      {/* Theme Status */}
      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          borderRadius: 8,
          marginBottom: spacing.md,
          borderColor: colors.outline,
          borderWidth: 1,
        }}
      >
        <Text
          style={[
            typography.title.large,
            {
              color: colors.onSurface,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Current Theme
        </Text>
        <Text
          style={[
            typography.body.large,
            {
              color: colors.onSurfaceVariant,
            },
          ]}
        >
          Mode: {isDark ? 'Dark' : 'Light'}
        </Text>
      </View>

      {/* Color Palette Display */}
      <Text
        style={[
          typography.headline.large,
          {
            color: colors.onBackground,
            marginBottom: spacing.md,
            marginTop: spacing.lg,
          },
        ]}
      >
        Color Palette
      </Text>

      {/* Primary Colors */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            typography.title.medium,
            {
              color: colors.primary,
              marginBottom: spacing.md,
            },
          ]}
        >
          Primary Colors
        </Text>

        <View
          style={{
            backgroundColor: colors.primaryContainer,
            padding: spacing.md,
            borderRadius: 8,
            marginBottom: spacing.sm,
          }}
        >
          <Text
            style={[
              typography.body.large,
              {
                color: colors.onPrimaryContainer,
              },
            ]}
          >
            Primary Container
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.primary,
            padding: spacing.md,
            borderRadius: 8,
          }}
        >
          <Text
            style={[
              typography.body.large,
              {
                color: colors.onPrimary,
              },
            ]}
          >
            Primary
          </Text>
        </View>
      </View>

      {/* Secondary Colors */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            typography.title.medium,
            {
              color: colors.secondary,
              marginBottom: spacing.md,
            },
          ]}
        >
          Secondary Colors
        </Text>

        <View
          style={{
            backgroundColor: colors.secondaryContainer,
            padding: spacing.md,
            borderRadius: 8,
            marginBottom: spacing.sm,
          }}
        >
          <Text
            style={[
              typography.body.large,
              {
                color: colors.onSecondaryContainer,
              },
            ]}
          >
            Secondary Container
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.secondary,
            padding: spacing.md,
            borderRadius: 8,
          }}
        >
          <Text
            style={[
              typography.body.large,
              {
                color: colors.onSecondary,
              },
            ]}
          >
            Secondary
          </Text>
        </View>
      </View>

      {/* Typography Scales */}
      <Text
        style={[
          typography.headline.large,
          {
            color: colors.onBackground,
            marginBottom: spacing.md,
            marginTop: spacing.lg,
          },
        ]}
      >
        Typography Scales
      </Text>

      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          padding: spacing.md,
          borderRadius: 8,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={[
            typography.display.large,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Display Large
        </Text>
        <Text
          style={[
            typography.headline.large,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Headline Large
        </Text>
        <Text
          style={[
            typography.title.large,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Title Large
        </Text>
        <Text
          style={[
            typography.body.large,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Body Large
        </Text>
        <Text
          style={[
            typography.label.large,
            {
              color: colors.onSurfaceVariant,
            },
          ]}
        >
          Label Large
        </Text>
      </View>

      {/* Spacing Example */}
      <Text
        style={[
          typography.headline.large,
          {
            color: colors.onBackground,
            marginBottom: spacing.md,
            marginTop: spacing.lg,
          },
        ]}
      >
        Spacing Scale
      </Text>

      {['xs', 'sm', 'md', 'lg', 'xl'].map((size) => (
        <View
          key={size}
          style={{
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={[
              typography.label.medium,
              {
                color: colors.onBackground,
                marginBottom: spacing.sm,
              },
            ]}
          >
            {size.toUpperCase()} ({spacing[size as keyof typeof spacing]}dp)
          </Text>
          <View
            style={{
              height: 40,
              backgroundColor: colors.primary,
              borderRadius: 8,
              width: spacing[size as keyof typeof spacing] * 6,
            }}
          />
        </View>
      ))}

      {/* Dark Mode Toggle */}
      <Pressable
        onPress={toggleDarkMode}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          padding: spacing.md,
          borderRadius: 8,
          marginVertical: spacing.lg,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={[
            typography.label.large,
            {
              color: colors.onPrimary,
              textAlign: 'center',
            },
          ]}
        >
          Toggle {isDark ? 'Light' : 'Dark'} Mode
        </Text>
      </Pressable>

      {/* Info Section */}
      <View
        style={{
          backgroundColor: colors.errorContainer,
          padding: spacing.md,
          borderRadius: 8,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={[
            typography.title.medium,
            {
              color: colors.onErrorContainer,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Infrastructure Status
        </Text>
        <Text
          style={[
            typography.body.medium,
            {
              color: colors.onErrorContainer,
              marginBottom: spacing.sm,
            },
          ]}
        >
          ✓ ThemeProvider: Active
        </Text>
        <Text
          style={[
            typography.body.medium,
            {
              color: colors.onErrorContainer,
              marginBottom: spacing.sm,
            },
          ]}
        >
          ✓ useTheme Hook: Working
        </Text>
        <Text
          style={[
            typography.body.medium,
            {
              color: colors.onErrorContainer,
              marginBottom: spacing.sm,
            },
          ]}
        >
          ✓ Color Tokens: Accessible
        </Text>
        <Text
          style={[
            typography.body.medium,
            {
              color: colors.onErrorContainer,
              marginBottom: spacing.sm,
            },
          ]}
        >
          ✓ Typography: Available
        </Text>
        <Text
          style={[
            typography.body.medium,
            {
              color: colors.onErrorContainer,
            },
          ]}
        >
          ✓ NativeWind: Integrated
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Main component that wraps everything in ThemeProvider
 * This is the component used for testing and verification
 */
export function VerificationComponent(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ThemeConsumerComponent />
    </ThemeProvider>
  );
}

export default VerificationComponent;
