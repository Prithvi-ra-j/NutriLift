# Material UI 3 Component Library - Design

## Overview

The Material UI 3 component library provides a complete set of production-ready React Native components following Material Design 3 specifications. The library leverages NativeWind (Tailwind for React Native) for styling, implements a comprehensive color system with dark mode support, and ensures accessibility compliance throughout. Components are organized into logical groups: basic UI controls, navigation patterns, overlay/feedback components, and data display components.

The architecture uses a theme provider pattern with React Context to distribute design tokens (colors, typography, spacing) throughout the component tree without prop drilling. All components support keyboard navigation and screen reader access per WCAG AA standards.

## Architecture

### Component Organization

```
material-ui-3/
├── core/
│   ├── theme/
│   │   ├── colors.ts          # MD3 color tokens and palette
│   │   ├── typography.ts      # Text styles and scales
│   │   ├── spacing.ts         # Spacing scale
│   │   └── ThemeProvider.tsx  # Context provider
│   ├── utils/
│   │   ├── accessibility.ts   # A11y helpers
│   │   ├── classNames.ts      # Tailwind class composition
│   │   └── theme.ts           # Theme utilities
│   └── types/
│       └── component.ts       # Common component types
├── components/
│   ├── basic/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── TextField/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Typography/
│   │   └── index.ts
│   ├── navigation/
│   │   ├── NavigationBar/
│   │   ├── NavigationRail/
│   │   ├── Tabs/
│   │   ├── Drawer/
│   │   └── index.ts
│   ├── overlay/
│   │   ├── Dialog/
│   │   ├── Snackbar/
│   │   ├── Menu/
│   │   ├── Tooltip/
│   │   └── index.ts
│   ├── data-display/
│   │   ├── List/
│   │   ├── DataTable/
│   │   ├── ProgressBar/
│   │   ├── Badge/
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   ├── useTheme.ts           # Access theme context
│   ├── useMediaQuery.ts      # Responsive queries
│   ├── useKeyboardNav.ts     # Keyboard navigation
│   └── useA11y.ts            # Accessibility utilities
├── styles/
│   ├── base.css              # Base Tailwind customizations
│   ├── components.css        # Component-specific styles
│   └── theme.css             # Theme-specific overrides
└── index.ts                  # Main export file
```

### Theme System Architecture

```
ThemeProvider (Root)
├── Light Theme Context
│   ├── Colors (MD3 semantic roles)
│   ├── Typography scales
│   └── Spacing/elevation values
├── Dark Theme Context
│   └── [Same structure with dark values]
└── Utilities
    ├── Dynamic color generation
    ├── Contrast checking
    └── Token resolution
```

Each component accesses the theme via the `useTheme()` hook, enabling:
- Automatic light/dark mode switching
- Consistent color application
- Type-safe theme tokens
- Easy customization without component modification

## Components and Interfaces

### Basic Components

#### Button Component

**Variants:** filled, elevated, tonal, outlined, text

**Props:**
```typescript
interface ButtonProps extends Pressable Props {
  variant?: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  leading?: ReactNode;  // Icon or element
  trailing?: ReactNode;
  children: string | ReactNode;
}
```

**Key Features:**
- Touch target minimum 48x48dp per Material Design guidelines
- Automatic ripple/press feedback
- Focus indicators visible to keyboard users
- Disabled state with reduced opacity and no interaction
- Icon support with consistent sizing

**Styling Approach:**
- Use Tailwind classes for layout and sizing
- Apply color tokens from theme context
- Implement pressed state via NativeWind's `active:` pseudo-class
- Support custom className extension for advanced use cases

#### Card Component

**Variants:** elevated, filled, outlined

**Props:**
```typescript
interface CardProps extends ViewProps {
  variant?: 'elevated' | 'filled' | 'outlined';
  children: ReactNode;
  onPress?: () => void;
  elevation?: number;
}
```

**Key Features:**
- Elevation/shadow variations for visual hierarchy
- Optional press handler for interactive cards
- Consistent internal spacing
- Supports children with automatic layout

#### TextField Component

**Variants:** filled, outlined

**Props:**
```typescript
interface TextFieldProps extends TextInputProps {
  variant?: 'filled' | 'outlined';
  label?: string;
  helper?: string;
  error?: boolean | string;
  leading?: ReactNode;
  trailing?: ReactNode;
  multiline?: boolean;
}
```

**Key Features:**
- Animated label floating on focus
- Error state with red border and error message
- Helper text display below field
- Icon support (leading/trailing)
- Character count display

#### Checkbox, Radio, Switch Components

**Props:**
```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;  // Checkbox only
}

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}
```

**Key Features:**
- Touch target minimum 48x48dp
- Smooth animations on state change
- Keyboard accessible
- Label support for better UX

#### Typography System

**Scales (MD3):**
- Display: Large, Medium, Small (32dp, 28dp, 26dp)
- Headline: Large, Medium, Small (32dp, 28dp, 24dp)
- Title: Large, Medium, Small (22dp, 16dp, 14dp)
- Body: Large, Medium, Small (16dp, 14dp, 12dp)
- Label: Large, Medium, Small (14dp, 12dp, 11dp)

**Props:**
```typescript
interface TextProps extends TextProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'error' | 'on-surface' | string;
  weight?: 'light' | 'regular' | 'medium' | 'bold';
}
```

### Navigation Components

#### NavigationBar Component

**Props:**
```typescript
interface NavigationBarProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
}
```

**Key Features:**
- 5 items maximum (Material Design recommendation)
- Active item highlighting
- Optional badge support
- Keyboard navigation (arrow keys)

#### NavigationRail Component

**Props:**
```typescript
interface NavigationRailProps {
  items: NavigationItem[];
  activeKey: string;
  onItemPress: (key: string) => void;
  floating?: boolean;  // Rail width styling
}
```

**Key Features:**
- Vertical layout for tablets/desktop
- Floating or extended rail support
- Top icon (logo/profile) support
- FAB support at bottom

#### Tabs Component

**Props:**
```typescript
interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  variant?: 'primary' | 'secondary';
  scrollable?: boolean;
}

interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
}
```

**Key Features:**
- Scrollable and non-scrollable modes
- Indicator bar animation
- Icon + label support
- Keyboard navigation (arrow keys)

#### Drawer Component

**Props:**
```typescript
interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  modal?: boolean;
  header?: ReactNode;
  children: ReactNode;
}
```

**Key Features:**
- Modal (overlay) and permanent modes
- Scrim overlay with close on tap
- Smooth slide animation
- Keyboard support (Escape to close)

### Overlay and Feedback Components

#### Dialog Component

**Props:**
```typescript
interface DialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  actions?: DialogAction[];
  type?: 'alert' | 'confirmation';
}

interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}
```

**Key Features:**
- Modal behavior with scrim
- Auto-layout for small screens
- Full-width on mobile, max-width on tablet
- Keyboard support (Enter for primary action, Escape to dismiss)

#### Snackbar Component

**Props:**
```typescript
interface SnackbarProps {
  visible: boolean;
  onDismiss: () => void;
  message: string;
  action?: SnackbarAction;
  duration?: number;  // ms, default 4000
}

interface SnackbarAction {
  label: string;
  onPress: () => void;
}
```

**Key Features:**
- Auto-dismiss with configurable duration
- Optional action button
- Bottom position with safe area respect
- Smooth slide animation

#### Menu Component

**Props:**
```typescript
interface MenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: MenuItem[];
  anchor?: View;  // Position relative to anchor
}

interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
}
```

**Key Features:**
- Dropdown positioning
- Keyboard navigation (arrow keys, Enter)
- Auto-dismiss on selection
- Click outside to close

#### Tooltip Component

**Props:**
```typescript
interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
```

**Key Features:**
- Show on hover or focus
- Auto-positioning to avoid edges
- Non-intrusive behavior
- Accessible via screen readers

### Data Display Components

#### List Component

**Props:**
```typescript
interface ListProps {
  items: ListItem[];
  renderItem?: (item: ListItem) => ReactNode;
  virtualized?: boolean;
  onItemPress?: (item: ListItem) => void;
}

interface ListItem {
  key: string;
  title: string;
  subtitle?: string;
  description?: string;
  leading?: ReactNode;  // Avatar/icon
  trailing?: ReactNode;  // Icon/action
}
```

**Key Features:**
- Single-line, two-line, three-line layouts
- Avatar/icon support
- Action button support
- Dividers between items
- Virtualization for performance

#### DataTable Component

**Props:**
```typescript
interface DataTableProps {
  columns: Column[];
  data: Row[];
  sortable?: boolean;
  selectable?: boolean;
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  onSelectionChange?: (selectedKeys: string[]) => void;
}

interface Column {
  key: string;
  label: string;
  width?: number | string;
  sortable?: boolean;
}

interface Row {
  key: string;
  data: Record<string, any>;
}
```

**Key Features:**
- Sticky header
- Column sorting with visual indicators
- Row selection with checkboxes
- Horizontal scrolling on small screens
- Keyboard accessible

#### Progress Component

**Props:**
```typescript
interface ProgressProps {
  value: number;  // 0-100
  variant?: 'linear' | 'circular';
  size?: 'small' | 'medium' | 'large';  // Circular only
  determinate?: boolean;  // Animated if false
  label?: string;  // Show percentage
}
```

**Key Features:**
- Linear and circular variants
- Smooth animations
- Determinate and indeterminate modes
- Optional label display
- Accessible progress announcements

#### Badge Component

**Props:**
```typescript
interface BadgeProps {
  children: ReactNode;
  content: string | number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  variant?: 'standard' | 'dot';
}
```

**Key Features:**
- Overlay positioning
- Content size variations
- Dot badge variant
- Visible/hidden states
- Accessible labeling

## Data Models

### Theme Token Structure

```typescript
interface ThemeTokens {
  // Color tokens
  colors: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    shadow: string;
    scrim: string;
  };

  // Typography
  typography: {
    display: { large: TextStyle; medium: TextStyle; small: TextStyle };
    headline: { large: TextStyle; medium: TextStyle; small: TextStyle };
    title: { large: TextStyle; medium: TextStyle; small: TextStyle };
    body: { large: TextStyle; medium: TextStyle; small: TextStyle };
    label: { large: TextStyle; medium: TextStyle; small: TextStyle };
  };

  // Spacing and sizing
  spacing: {
    xs: number;   // 4
    sm: number;   // 8
    md: number;   // 16
    lg: number;   // 24
    xl: number;   // 32
  };

  // Elevation/shadows
  elevation: {
    0: ShadowStyle;
    1: ShadowStyle;
    2: ShadowStyle;
    3: ShadowStyle;
    4: ShadowStyle;
    5: ShadowStyle;
  };

  // Component-specific tokens
  touchTargetSize: number;  // 48dp minimum
}

interface ThemeContext {
  tokens: ThemeTokens;
  isDark: boolean;
  toggleDarkMode: () => void;
  setCustomTokens: (tokens: Partial<ThemeTokens>) => void;
}
```

### Component State Model

```typescript
interface ComponentState {
  // Base states
  enabled: boolean;
  focused: boolean;
  pressed: boolean;
  hovered: boolean;

  // Value states (inputs)
  value?: string | boolean | number | any[];
  error?: string | boolean;
  disabled?: boolean;

  // UI states
  loading?: boolean;
  visible?: boolean;
  expanded?: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Since Material UI 3 components involve UI rendering, theme application, and interactive state management, we'll focus on properties that test the component logic rather than visual rendering:

### Property 1: Theme Token Consistency

**For any** component rendered within a ThemeProvider with a set of theme tokens, all child components SHALL access the same theme tokens consistently without requiring explicit prop passing.

**Validates: Requirements 1.1, 1.2, 1.3, 6.1, 6.5**

### Property 2: Dark Mode Round Trip

**For any** theme in light mode, switching to dark mode and then back to light mode SHALL restore all color values to their original state.

**Validates: Requirements 1.2, 1.3, 6.2**

### Property 3: Color Contrast Compliance

**For any** semantic color pair used in components (text + background), the contrast ratio SHALL meet or exceed WCAG AA standards (4.5:1 for text, 3:1 for UI components).

**Validates: Requirements 1.7, 7.1**

### Property 4: Keyboard Navigation Accessibility

**For any** interactive component rendered with keyboard support enabled, all interactive elements SHALL be reachable and operable using only keyboard navigation (Tab, Arrow keys, Enter, Escape).

**Validates: Requirements 2.9, 3.5, 4.9, 7.2**

### Property 5: Button Variant Consistency

**For any** Button component across all variants (filled, elevated, tonal, outlined, text), the touch target size SHALL not be less than 48x48dp.

**Validates: Requirement 2.1**

### Property 6: Component State Isolation

**For any** two instances of the same component with different state values, the state of one component SHALL not affect the state or rendering of the other component.

**Validates: Requirement 6.5**

### Property 7: Theme Dynamic Switching

**For any** component rendered with a theme, when theme values are changed through ThemeProvider, all components rendering within that provider SHALL reflect the new theme values within the next render cycle.

**Validates: Requirement 6.6**

### Property 8: Accessibility Tree Completeness

**For any** interactive component, the accessibility tree (ARIA roles, labels, states) SHALL be complete and accurately represent the component's interactive capabilities.

**Validates: Requirement 7.3, 7.4**

## Error Handling

### Theme System Error Handling

- **Missing Theme Provider**: Components SHALL render with fallback default theme and log a warning
- **Invalid Theme Tokens**: Components SHALL validate tokens at runtime and apply fallbacks for missing values
- **Theme Token Type Mismatch**: Type checking via TypeScript prevents invalid tokens at compile time

### Component Error Handling

- **Invalid Props**: Components SHALL validate props and either use defaults or throw meaningful errors in development
- **Rendering Errors**: Components SHALL implement error boundaries to gracefully handle child rendering failures
- **Accessibility Errors**: Components SHALL validate ARIA attributes and log warnings for invalid combinations

### Performance Error Handling

- **Memory Pressure**: Virtualized components SHALL adjust item count when memory is constrained
- **Rendering Timeouts**: Components SHALL implement timeout safety for animations
- **Context Provider Errors**: If ThemeProvider fails, components SHALL fall back to inline default styling

## Testing Strategy

### Property-Based Testing

Property-based tests validate universal correctness properties using generated test cases:

**Test Configuration:**
- Minimum 100 iterations per property test
- Random seed for reproducibility
- Timeout: 5000ms per test
- Coverage targets: all theme variants, component states, and edge cases

**Property-Based Test Tasks:**
1. **Property 1: Theme Token Consistency** - Generate random theme configs and verify consistent access across component tree
2. **Property 2: Dark Mode Round Trip** - Generate random color schemes, toggle modes multiple times, verify state preservation
3. **Property 3: Color Contrast Compliance** - Generate all semantic color pairs and verify WCAG compliance programmatically
4. **Property 4: Keyboard Navigation** - Generate random component hierarchies and verify keyboard reachability
5. **Property 5: Button Variant Consistency** - Verify all button variants meet 48x48dp minimum touch target
6. **Property 6: Component State Isolation** - Create multiple component instances with different states and verify independence
7. **Property 7: Theme Dynamic Switching** - Simulate theme changes and verify component re-renders with new values
8. **Property 8: Accessibility Tree Completeness** - Verify ARIA attributes for all interactive components

### Unit Testing

Unit tests validate specific examples and edge cases:

- **Component Rendering**: Each component renders correctly with default and custom props
- **State Management**: Components correctly update internal state on user interaction
- **Event Handling**: Callbacks fire with correct arguments at appropriate times
- **Prop Validation**: Invalid props are either ignored with defaults or logged appropriately
- **Edge Cases**: Empty content, very long text, large lists, rapid interactions

**Coverage Targets:**
- Statement coverage: 85%+
- Branch coverage: 80%+
- Function coverage: 90%+

### Integration Testing

Integration tests validate component interactions and theme application:

- **Theme Provider Integration**: Components correctly receive and apply theme values
- **Navigation Flows**: Navigation components correctly route and update active states
- **Modal Dialogs**: Modals correctly trap focus and close on appropriate actions
- **Form Submissions**: Form components correctly collect and validate data
- **Accessibility Integration**: Screen readers correctly announce component information

### Visual Regression Testing

Since visual appearance is critical for a design system:

- **Component Screenshots**: Capture baseline screenshots of all variants
- **Theme Variants**: Test components in light and dark modes
- **Responsive Layouts**: Test components across multiple screen sizes
- **Interactive States**: Capture pressed, focused, disabled, and error states
- **Automated Comparison**: Use visual diff tools to detect unintended changes

### Performance Testing

Performance benchmarks ensure components maintain smooth interaction:

- **Render Performance**: Individual components render within 16ms
- **Theme Switching**: Theme changes apply within 100ms
- **List Virtualization**: Large lists (1000+ items) maintain 60fps scrolling
- **Memory Profiling**: No memory leaks during component mount/unmount cycles
- **Animation Performance**: Smooth 60fps animations on target devices

### Accessibility Testing

Accessibility compliance is verified through multiple approaches:

- **Automated Audits**: Use axe-core to detect WCAG violations
- **Keyboard Navigation**: Manual testing of Tab, Arrow keys, Enter, Escape
- **Screen Reader Testing**: VoiceOver (iOS) and TalkBack (Android) verification
- **Color Contrast**: Automated verification of WCAG AA contrast ratios
- **Focus Management**: Verify focus trap in modals, focus restoration on close

### Documentation and Examples

- **Storybook Integration**: Interactive component examples with theme switching
- **API Documentation**: JSDoc comments and TypeScript types define all props
- **Usage Examples**: Clear code examples for each component and variant
- **Theming Guide**: Step-by-step guide for customizing colors and typography
- **Migration Guide**: Guidance for adopting library in existing projects

### Test Organization

```
__tests__/
├── components/
│   ├── basic/
│   │   ├── Button.test.ts
│   │   ├── Card.test.ts
│   │   ├── TextField.test.ts
│   │   ├── Checkbox.test.ts
│   │   ├── Radio.test.ts
│   │   ├── Switch.test.ts
│   │   └── Typography.test.ts
│   ├── navigation/
│   │   ├── NavigationBar.test.ts
│   │   ├── NavigationRail.test.ts
│   │   ├── Tabs.test.ts
│   │   └── Drawer.test.ts
│   ├── overlay/
│   │   ├── Dialog.test.ts
│   │   ├── Snackbar.test.ts
│   │   ├── Menu.test.ts
│   │   └── Tooltip.test.ts
│   └── data-display/
│       ├── List.test.ts
│       ├── DataTable.test.ts
│       ├── ProgressBar.test.ts
│       └── Badge.test.ts
├── core/
│   ├── theme.test.ts
│   ├── accessibility.test.ts
│   └── utils.test.ts
├── integration/
│   ├── ThemeProvider.integration.test.ts
│   ├── DarkMode.integration.test.ts
│   └── FormIntegration.integration.test.ts
└── visual/
    ├── Button.visual.test.ts
    ├── Cards.visual.test.ts
    └── Navigation.visual.test.ts
```

