/**
 * Material Design 3 Core Module
 * Exports theme system, utilities, and types
 */

// Theme system
export { ThemeProvider, ThemeContext } from './theme/ThemeProvider';
export { lightThemeColors, darkThemeColors, getContrastRatio, getRelativeLuminance, verifyColorContrast } from './theme/colors';
export { typographyScales, spacingScale, fontWeights, getTypographyStyle, createTextStyle } from './theme/typography';

// Types
export type {
  ComponentState,
  ThemeTokens,
  ThemeContext as ThemeContextType,
  ButtonProps,
  CardProps,
  TextFieldProps,
  CheckboxProps,
  RadioProps,
  RadioGroupProps,
  SwitchProps,
  TypographyVariant,
  TextProps,
  NavigationItem,
  NavigationBarProps,
  NavigationRailProps,
  TabItem,
  TabsProps,
  DrawerProps,
  DialogAction,
  DialogProps,
  SnackbarAction,
  SnackbarProps,
  MenuItem,
  MenuProps,
  TooltipProps,
  ListItem,
  Column,
  Row,
} from './types/component';

// Utilities
export { cn, responsive, withStates, variantClasses, colorClasses, spacingClasses, gap, padding, margin, paddingX, paddingY, borderRadiusClasses, opacityClasses } from './utils/classNames';
export {
  createAccessibleLabel,
  getAriaRole,
  createAccessibleState,
  formatDisabledState,
  formatLoadingState,
  formatErrorState,
  KeyboardKeys,
  isNavigationKey,
  isSubmitKey,
  isEscapeKey,
  isArrowKey,
  getArrowDirection,
  calculateTabIndex,
  getNextFocusIndex,
  focusElementById,
  announceToScreenReader,
  A11yAnnouncements,
} from './utils/accessibility';
export {
  getThemeColor,
  getThemeTypography,
  getSpacing,
  getElevation,
  createComponentStyle,
  mapSemanticColors,
  getFocusIndicatorColor,
  getDisabledOpacity,
  getPressedStateColor,
  validateThemeTokens,
  mergeThemeTokens,
} from './utils/theme';
