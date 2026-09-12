/**
 * Common component types and interfaces for Material Design 3 library
 */

import { ReactNode } from 'react';
import { TextStyle, ViewProps, TextInputProps, PressableProps } from 'react-native';

/**
 * Component state model tracking interactive and value states
 */
export interface ComponentState {
  // Base interactive states
  enabled: boolean;
  focused: boolean;
  pressed: boolean;
  hovered: boolean;

  // Value states for input components
  value?: string | boolean | number | any[];
  error?: string | boolean;
  disabled?: boolean;

  // UI states
  loading?: boolean;
  visible?: boolean;
  expanded?: boolean;
}

/**
 * Theme tokens containing all design system values
 */
export interface ThemeTokens {
  // Color tokens - Material Design 3 semantic colors
  colors: {
    // Primary color group
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;

    // Secondary color group
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;

    // Tertiary color group
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;

    // Error color group
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;

    // Neutral colors
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;

    // Outline colors
    outline: string;
    outlineVariant: string;

    // Additional colors
    shadow: string;
    scrim: string;
  };

  // Typography scales
  typography: {
    display: {
      large: TextStyle;
      medium: TextStyle;
      small: TextStyle;
    };
    headline: {
      large: TextStyle;
      medium: TextStyle;
      small: TextStyle;
    };
    title: {
      large: TextStyle;
      medium: TextStyle;
      small: TextStyle;
    };
    body: {
      large: TextStyle;
      medium: TextStyle;
      small: TextStyle;
    };
    label: {
      large: TextStyle;
      medium: TextStyle;
      small: TextStyle;
    };
  };

  // Spacing scale
  spacing: {
    xs: number; // 4
    sm: number; // 8
    md: number; // 16
    lg: number; // 24
    xl: number; // 32
  };

  // Elevation and shadow values
  elevation: {
    0: ViewProps['style'];
    1: ViewProps['style'];
    2: ViewProps['style'];
    3: ViewProps['style'];
    4: ViewProps['style'];
    5: ViewProps['style'];
  };

  // Component-specific values
  touchTargetSize: number; // 48dp minimum per Material Design
}

/**
 * Theme context interface providing theme access and controls
 */
export interface ThemeContext {
  tokens: ThemeTokens;
  isDark: boolean;
  toggleDarkMode: () => void;
  setCustomTokens: (tokens: Partial<ThemeTokens>) => void;
}

/**
 * Button component prop types
 */
export interface ButtonProps extends PressableProps {
  variant?: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: string | ReactNode;
}

/**
 * Card component prop types
 */
export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'filled' | 'outlined';
  children: ReactNode;
  onPress?: () => void;
  elevation?: number;
}

/**
 * TextField component prop types
 */
export interface TextFieldProps extends TextInputProps {
  variant?: 'filled' | 'outlined';
  label?: string;
  helper?: string;
  error?: boolean | string;
  leading?: ReactNode;
  trailing?: ReactNode;
  multiline?: boolean;
}

/**
 * Checkbox component prop types
 */
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;
}

/**
 * Radio component prop types
 */
export interface RadioProps {
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * RadioGroup component prop types
 */
export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * Switch component prop types
 */
export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Typography component prop types
 */
export type TypographyVariant =
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
  | 'label-small';

export interface TextProps extends TextInputProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'error' | 'on-surface' | string;
  weight?: 'light' | 'regular' | 'medium' | 'bold';
}

/**
 * Navigation Bar component types
 */
export interface NavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
}

export interface NavigationBarProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
}

/**
 * Dialog component types
 */
export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export interface DialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  actions?: DialogAction[];
  type?: 'alert' | 'confirmation';
}

/**
 * Snackbar component types
 */
export interface SnackbarAction {
  label: string;
  onPress: () => void;
}

export interface SnackbarProps {
  visible: boolean;
  onDismiss: () => void;
  message: string;
  action?: SnackbarAction;
  duration?: number; // ms, default 4000
}

/**
 * List item component types
 */
export interface ListItem {
  key: string;
  title: string;
  subtitle?: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export interface ListProps {
  items: ListItem[];
  renderItem?: (item: ListItem) => ReactNode;
  virtualized?: boolean;
  onItemPress?: (item: ListItem) => void;
}

/**
 * DataTable component types
 */
export interface Column {
  key: string;
  label: string;
  width?: number | string;
  sortable?: boolean;
}

export interface Row {
  key: string;
  data: Record<string, any>;
}

export interface DataTableProps {
  columns: Column[];
  data: Row[];
  sortable?: boolean;
  selectable?: boolean;
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onSelectionChange?: (selectedKeys: string[]) => void;
}

/**
 * Progress component types
 */
export interface ProgressProps {
  value: number; // 0-100
  variant?: 'linear' | 'circular';
  size?: 'small' | 'medium' | 'large';
  determinate?: boolean;
  label?: string;
}

/**
 * Badge component types
 */
export interface BadgeProps {
  children: ReactNode;
  content: string | number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  variant?: 'standard' | 'dot';
}

/**
 * Navigation Rail component types
 */
export interface NavigationRailProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
  floating?: boolean;
}

/**
 * Tab item component types
 */
export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

/**
 * Tabs component types
 */
export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  variant?: 'primary' | 'secondary';
  scrollable?: boolean;
}

/**
 * Drawer component types
 */
export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  modal?: boolean;
  header?: ReactNode;
  children: ReactNode;
}

/**
 * Menu item component types
 */
export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
}

/**
 * Menu component types
 */
export interface MenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: MenuItem[];
  anchor?: ReactNode;
}

/**
 * Tooltip component types
 */
export interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
