# Material Design 3 Component Library

A comprehensive Material Design 3 (MD3) component library for React Native Expo using NativeWind and Tailwind CSS.

## Project Structure

```
src/
├── core/                           # Theme system and utilities
│   ├── theme/
│   │   ├── colors.ts              # MD3 color tokens (light/dark)
│   │   ├── typography.ts          # Typography scales
│   │   └── ThemeProvider.tsx      # React Context theme provider
│   ├── utils/
│   │   ├── accessibility.ts       # A11y utilities and helpers
│   │   ├── classNames.ts          # Tailwind class composition
│   │   └── theme.ts               # Theme utilities
│   ├── types/
│   │   └── component.ts           # TypeScript type definitions
│   └── index.ts                   # Core module exports
│
├── components/                     # UI Components (organized by category)
│   ├── basic/                     # Button, Card, TextField, Checkbox, Radio, Switch, Typography
│   ├── navigation/                # NavigationBar, NavigationRail, Tabs, Drawer
│   ├── overlay/                   # Dialog, Snackbar, Menu, Tooltip
│   ├── data-display/              # List, DataTable, Progress, Badge
│   └── index.ts                   # Components module exports
│
├── hooks/                          # Custom React hooks
│   ├── useTheme.ts                # Access theme context and tokens
│   └── index.ts                   # Hooks exports
│
├── styles/                         # Global CSS (future)
│   └── base.css                   # Base Tailwind customizations
│
└── index.ts                        # Main library entry point
```

## Core Features

### ✅ Complete Material Design 3 Color System
- Light and dark theme support
- All semantic color roles (primary, secondary, tertiary, error, neutral)
- WCAG AA contrast compliance
- Dynamic theme switching with persistence

### ✅ Type-Safe Components
- Full TypeScript support with detailed type definitions
- Proper prop interfaces for all components
- Accessibility-first approach

### ✅ Theme System
- React Context-based theme distribution
- No prop-drilling required
- Custom theme token support
- Automatic light/dark mode detection

### ✅ Accessibility First
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators for keyboard users
- Color contrast validation (WCAG AA)

### ✅ NativeWind Integration
- Tailwind CSS for React Native
- Responsive design support
- Dark mode support via Tailwind
- Class composition utilities

## Getting Started

### Basic Setup

```tsx
import { ThemeProvider } from '@/core';
import { useDarkMode } from '@/hooks';

export default function App() {
  return (
    <ThemeProvider>
      <MyApp />
    </ThemeProvider>
  );
}

function MyApp() {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <Pressable onPress={toggleDarkMode}>
      <Text>Toggle Theme ({isDark ? 'Dark' : 'Light'})</Text>
    </Pressable>
  );
}
```

### Using Colors

```tsx
import { useColors } from '@/hooks';

export function MyComponent() {
  const colors = useColors();

  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.onSurface }}>Hello</Text>
    </View>
  );
}
```

### Using Typography

```tsx
import { useTypography } from '@/hooks';
import { getTypographyStyle } from '@/core';

export function MyComponent() {
  const typography = useTypography();
  
  return (
    <Text style={getTypographyStyle('headline-large')}>
      My Headline
    </Text>
  );
}
```

## Configuration

### TypeScript Path Aliases

The following path aliases are configured in `tsconfig.json`:
- `@/core/*` → `./src/core/*`
- `@/components/*` → `./src/components/*`
- `@/hooks/*` → `./src/hooks/*`
- `@/styles/*` → `./src/styles/*`

### Tailwind Configuration

The `tailwind.config.js` includes:
- NativeWind preset
- Material Design 3 color tokens (customizable)
- Typography scale support
- Responsive breakpoints

## Development Guidelines

### Creating Components

All components should:
1. Use the `useTheme()` hook for theme access
2. Accept theme-aware props
3. Support keyboard navigation
4. Include proper ARIA labels
5. Be properly typed with TypeScript

### Testing

Component testing includes:
- **Unit tests** - Individual component behavior
- **Property tests** - Universal correctness properties
- **Integration tests** - Theme application and interactions
- **Accessibility tests** - A11y compliance verification
- **Visual regression tests** - Style consistency

### Accessibility

Requirements for all components:
- Keyboard navigable (Tab, Arrow keys, Enter, Escape)
- Screen reader friendly (ARIA labels/roles)
- Focus indicators visible
- Touch targets minimum 48x48dp
- Color contrast ≥ WCAG AA (4.5:1 text, 3:1 UI)

## Color System

### Semantic Colors (Light Theme)

| Role | Color | Use Case |
|------|-------|----------|
| primary | #6750a4 | Primary actions, highlights |
| onPrimary | #ffffff | Text/icons on primary |
| secondary | #625b71 | Secondary actions |
| error | #b3261e | Error states, destructive actions |
| background | #fffbfe | Page background |
| surface | #fffbfe | Component backgrounds |

### Semantic Colors (Dark Theme)

| Role | Color | Use Case |
|------|-------|----------|
| primary | #d0bcff | Primary actions (adjusted for dark) |
| onPrimary | #371e55 | Text on primary (dark) |
| secondary | #ccc7db | Secondary actions (dark) |
| error | #f2b8b5 | Error states (dark) |
| background | #1c1b1f | Page background (dark) |
| surface | #1c1b1f | Component backgrounds (dark) |

## Typography System

Material Design 3 typography scales:

- **Display** (32dp, 28dp, 26dp) - Large headlines
- **Headline** (32dp, 28dp, 24dp) - Section headers
- **Title** (22dp, 16dp, 14dp) - Component titles
- **Body** (16dp, 14dp, 12dp) - Body text
- **Label** (14dp, 12dp, 11dp) - Labels, buttons

## Component Status

### Phase 1: Core Infrastructure ✅ COMPLETE

- [x] Project structure and TypeScript configuration
- [x] Material Design 3 color tokens
- [x] Typography system
- [x] Theme Provider with dark mode
- [x] Accessibility utilities
- [x] Class name utilities
- [x] Theme utilities
- [x] Type definitions
- [x] Hook exports
- [x] Module exports

### Phase 2-11: Component Implementation

- [ ] Basic UI Components (Button, Card, TextField, Checkbox, Radio, Switch, Text)
- [ ] Navigation Components (NavigationBar, NavigationRail, Tabs, Drawer)
- [ ] Overlay Components (Dialog, Snackbar, Menu, Tooltip)
- [ ] Data Display Components (List, DataTable, Progress, Badge)
- [ ] Theme system refinements and customization
- [ ] Accessibility compliance verification
- [ ] Component documentation and examples
- [ ] Performance optimization and testing
- [ ] Integration and final verification

## Requirements Mapping

This implementation satisfies these requirements:
- **Requirement 1.1** - Color system established with MD3 roles
- **Requirement 8.4** - TypeScript configuration and project organization
- **Requirement 1.7** - Contrast compliance utilities and validation

## Next Steps

1. **Implement Basic Components** (Task 2.1 - 2.10)
   - Button with all 5 variants
   - Card component
   - TextField with floating label
   - Form controls (Checkbox, Radio, Switch)
   - Typography component

2. **Create Unit Tests** (Tasks 2.2 - 3.8)
   - Property-based tests for button consistency
   - Unit tests for each component
   - State isolation verification

3. **Implement Navigation** (Tasks 4.1 - 4.10)
   - Navigation Bar with badge support
   - Navigation Rail for tablets
   - Tabs with animation
   - Modal Drawer

4. **Implement Overlay Components** (Tasks 5.1 - 5.10)
   - Dialog with alert/confirmation modes
   - Snackbar with auto-dismiss
   - Menu with keyboard support
   - Tooltip component

5. **Implement Data Display** (Tasks 6.1 - 6.10)
   - List with virtualization
   - DataTable with sorting
   - Progress indicators
   - Badge component

## Resources

- [Material Design 3](https://m3.material.io/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [WCAG AA Guidelines](https://www.w3.org/WAI/WCAG2AA-Conformance)

## License

Same as the Apex project.
