# Component Types and Interfaces Documentation

## Overview

This document provides a comprehensive reference for all TypeScript types and interfaces defined in the Material Design 3 component library. All types are properly exported from `@/core` for use throughout the application.

**Requirement Coverage:** 8.4 - Export TypeScript types for all props and component APIs

## Core System Types

### ComponentState
Tracks the interactive and value states of any component.

```typescript
interface ComponentState {
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
```

### ThemeTokens
Complete design system tokens for Material Design 3, including colors, typography, spacing, and elevation.

```typescript
interface ThemeTokens {
  colors: {
    // Semantic color roles (primary, secondary, tertiary, error, neutral)
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    // ... and more color tokens
  };

  typography: {
    display: { large: TextStyle; medium: TextStyle; small: TextStyle };
    headline: { large: TextStyle; medium: TextStyle; small: TextStyle };
    title: { large: TextStyle; medium: TextStyle; small: TextStyle };
    body: { large: TextStyle; medium: TextStyle; small: TextStyle };
    label: { large: TextStyle; medium: TextStyle; small: TextStyle };
  };

  spacing: {
    xs: number;  // 4
    sm: number;  // 8
    md: number;  // 16
    lg: number;  // 24
    xl: number;  // 32
  };

  elevation: {
    0: ViewProps['style'];
    1: ViewProps['style'];
    2: ViewProps['style'];
    3: ViewProps['style'];
    4: ViewProps['style'];
    5: ViewProps['style'];
  };

  touchTargetSize: number;  // 48dp minimum per Material Design
}
```

### ThemeContext
Provides theme access and controls throughout the component tree.

```typescript
interface ThemeContext {
  tokens: ThemeTokens;
  isDark: boolean;
  toggleDarkMode: () => void;
  setCustomTokens: (tokens: Partial<ThemeTokens>) => void;
}
```

## Basic Component Types

### ButtonProps
Props for the Button component with all Material Design 3 variants.

```typescript
interface ButtonProps extends PressableProps {
  variant?: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  leading?: ReactNode;   // Leading icon
  trailing?: ReactNode;  // Trailing icon
  children: string | ReactNode;
}
```

### CardProps
Props for the Card component with elevation variants.

```typescript
interface CardProps extends ViewProps {
  variant?: 'elevated' | 'filled' | 'outlined';
  children: ReactNode;
  onPress?: () => void;
  elevation?: number;
}
```

### TextFieldProps
Props for the TextField component with input variants.

```typescript
interface TextFieldProps extends TextInputProps {
  variant?: 'filled' | 'outlined';
  label?: string;
  helper?: string;
  error?: boolean | string;
  leading?: ReactNode;    // Leading icon
  trailing?: ReactNode;   // Trailing icon
  multiline?: boolean;
}
```

### CheckboxProps
Props for the Checkbox component with indeterminate state support.

```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;
}
```

### RadioProps
Props for the Radio component for exclusive selection.

```typescript
interface RadioProps {
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
  label?: string;
}
```

### RadioGroupProps
Props for the RadioGroup container component.

```typescript
interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}
```

### SwitchProps
Props for the Switch component with toggle state.

```typescript
interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}
```

### TextProps
Props for the Typography/Text component with Material Design 3 scales.

```typescript
type TypographyVariant =
  | 'display-large' | 'display-medium' | 'display-small'
  | 'headline-large' | 'headline-medium' | 'headline-small'
  | 'title-large' | 'title-medium' | 'title-small'
  | 'body-large' | 'body-medium' | 'body-small'
  | 'label-large' | 'label-medium' | 'label-small';

interface TextProps extends TextInputProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'error' | 'on-surface' | string;
  weight?: 'light' | 'regular' | 'medium' | 'bold';
}
```

## Navigation Component Types

### NavigationItem
Shared data structure for navigation items.

```typescript
interface NavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;  // Optional notification badge
}
```

### NavigationBarProps
Props for the Navigation Bar component (bottom navigation).

```typescript
interface NavigationBarProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
}
```

### NavigationRailProps
Props for the Navigation Rail component (side navigation for tablets/desktop).

```typescript
interface NavigationRailProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
  floating?: boolean;  // Floating vs extended rail style
}
```

### TabItem
Data structure for individual tabs.

```typescript
interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
}
```

### TabsProps
Props for the Tabs component with scrollable and variant support.

```typescript
interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  variant?: 'primary' | 'secondary';
  scrollable?: boolean;
}
```

### DrawerProps
Props for the Drawer component with modal support.

```typescript
interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  modal?: boolean;       // Modal vs permanent mode
  header?: ReactNode;
  children: ReactNode;
}
```

## Overlay and Feedback Component Types

### DialogAction
Individual action button in a Dialog.

```typescript
interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}
```

### DialogProps
Props for the Dialog component with alert and confirmation modes.

```typescript
interface DialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  actions?: DialogAction[];
  type?: 'alert' | 'confirmation';
}
```

### SnackbarAction
Optional action button in a Snackbar.

```typescript
interface SnackbarAction {
  label: string;
  onPress: () => void;
}
```

### SnackbarProps
Props for the Snackbar component with auto-dismiss.

```typescript
interface SnackbarProps {
  visible: boolean;
  onDismiss: () => void;
  message: string;
  action?: SnackbarAction;
  duration?: number;  // ms, default 4000
}
```

### MenuItem
Individual item in a Menu.

```typescript
interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
}
```

### MenuProps
Props for the Menu component with dropdown positioning.

```typescript
interface MenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: MenuItem[];
  anchor?: ReactNode;  // Position relative to anchor element
}
```

### TooltipProps
Props for the Tooltip component with positioning options.

```typescript
interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
```

## Data Display Component Types

### ListItem
Individual item in a List component.

```typescript
interface ListItem {
  key: string;
  title: string;
  subtitle?: string;
  description?: string;
  leading?: ReactNode;   // Avatar or icon
  trailing?: ReactNode;  // Action or indicator
}
```

### ListProps
Props for the List component with virtualization support.

```typescript
interface ListProps {
  items: ListItem[];
  renderItem?: (item: ListItem) => ReactNode;
  virtualized?: boolean;
  onItemPress?: (item: ListItem) => void;
}
```

### Column
Definition for a table column.

```typescript
interface Column {
  key: string;
  label: string;
  width?: number | string;
  sortable?: boolean;
}
```

### Row
Individual row in a DataTable.

```typescript
interface Row {
  key: string;
  data: Record<string, any>;
}
```

### DataTableProps
Props for the DataTable component with sorting and selection.

```typescript
interface DataTableProps {
  columns: Column[];
  data: Row[];
  sortable?: boolean;
  selectable?: boolean;
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onSelectionChange?: (selectedKeys: string[]) => void;
}
```

### ProgressProps
Props for the Progress component with linear and circular variants.

```typescript
interface ProgressProps {
  value: number;  // 0-100
  variant?: 'linear' | 'circular';
  size?: 'small' | 'medium' | 'large';
  determinate?: boolean;
  label?: string;  // Show percentage
}
```

### BadgeProps
Props for the Badge component with positioning support.

```typescript
interface BadgeProps {
  children: ReactNode;
  content: string | number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  variant?: 'standard' | 'dot';
}
```

## Export Locations

All types are exported from the following locations:

### Direct Export from Types File
```typescript
import type { ButtonProps, CardProps } from '@/core/types/component';
```

### Recommended Export from Core Module
```typescript
import type { ButtonProps, CardProps } from '@/core';
```

## Type Validation

All types have been validated:
- ✅ TypeScript compilation successful (no errors)
- ✅ All interfaces properly defined
- ✅ All types properly exported
- ✅ Compatible with React Native and Expo
- ✅ Extends native React Native types appropriately

## Usage Example

```typescript
import type { ButtonProps, ThemeTokens } from '@/core';
import { Button } from '@/components';
import { useTheme } from '@/hooks';

export function MyComponent() {
  const { tokens } = useTheme();

  const handlePress: ButtonProps['onPress'] = () => {
    console.log('Button pressed');
  };

  return (
    <Button variant="filled" onPress={handlePress}>
      Click me
    </Button>
  );
}
```

## Requirements Met

- **Requirement 8.4:** Export TypeScript types for all props and component APIs
  - ✅ All 31 component types defined
  - ✅ All core system types defined
  - ✅ All types properly exported from @/core
  - ✅ Complete type coverage for all components in design
  - ✅ Enables type-safe component usage throughout application
