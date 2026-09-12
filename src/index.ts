/**
 * Material Design 3 Component Library for React Native Expo
 *
 * A comprehensive Material Design 3 component library providing:
 * - Complete MD3 color system with light/dark theme support
 * - Reusable components (buttons, cards, inputs, navigation, etc.)
 * - Full WCAG AA accessibility compliance
 * - NativeWind (Tailwind) styling integration
 * - Type-safe TypeScript definitions
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@/core';
 * import { Button } from '@/components';
 * import { useTheme } from '@/hooks';
 *
 * export default function App() {
 *   return (
 *     <ThemeProvider>
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * function MyApp() {
 *   const { isDark, toggleDarkMode } = useDarkMode();
 *
 *   return (
 *     <Button onPress={toggleDarkMode}>
 *       Toggle Theme
 *     </Button>
 *   );
 * }
 * ```
 */

// Core theme system
export * from './core/index';

// Components
export * from './components/index';

// Hooks
export * from './hooks/index';
