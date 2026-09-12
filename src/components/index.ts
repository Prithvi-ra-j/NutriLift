/**
 * Unified Material Design 3 Components Export
 * This file serves as the main entry point for all UI components.
 */

// Basic Components
export * from './basic/Button';

// Overlay & Feedback Components
export * from './overlay/Dialog';
export * from './overlay/Menu';
export * from './overlay/Snackbar';
export * from './overlay/Tooltip';

// Data Display Components
export * from './data-display/Badge';
export * from './data-display/DataTable';
export * from './data-display/List';
export * from './data-display/Progress';

// Forms & Inputs (Assuming they will be added here or imported from similar directories)
// export * from './forms/TextField';
// export * from './forms/Switch';

// Theme Context Export
export { ThemeProvider } from '../core/theme/ThemeProvider';
export { useTheme, useColors, useTypography, useSpacing, useDarkMode } from '../hooks/useTheme';
