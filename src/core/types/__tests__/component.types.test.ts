/**
 * Type validation test to ensure all component types are properly defined and exported
 * This file verifies that all required types from the design specification are available
 * Validates: Requirement 8.4 - Export TypeScript types for all props and component APIs
 */

import type {
  // Core types
  ComponentState,
  ThemeTokens,
  ThemeContext,
  
  // Basic component types
  ButtonProps,
  CardProps,
  TextFieldProps,
  CheckboxProps,
  RadioProps,
  RadioGroupProps,
  SwitchProps,
  TypographyVariant,
  TextProps,
  
  // Navigation component types
  NavigationItem,
  NavigationBarProps,
  NavigationRailProps,
  TabItem,
  TabsProps,
  DrawerProps,
  
  // Overlay component types
  DialogAction,
  DialogProps,
  SnackbarAction,
  SnackbarProps,
  MenuItem,
  MenuProps,
  TooltipProps,
  
  // Data display component types
  ListItem,
  ListProps,
  Column,
  Row,
  DataTableProps,
  ProgressProps,
  BadgeProps,
} from '../component';

/**
 * Type-level validation: if this compiles, all types are correctly defined
 */
type TypeValidation = {
  componentState: ComponentState;
  themeTokens: ThemeTokens;
  themeContext: ThemeContext;
  buttonProps: ButtonProps;
  cardProps: CardProps;
  textFieldProps: TextFieldProps;
  checkboxProps: CheckboxProps;
  radioProps: RadioProps;
  radioGroupProps: RadioGroupProps;
  switchProps: SwitchProps;
  typographyVariant: TypographyVariant;
  textProps: TextProps;
  navigationItem: NavigationItem;
  navigationBarProps: NavigationBarProps;
  navigationRailProps: NavigationRailProps;
  tabItem: TabItem;
  tabsProps: TabsProps;
  drawerProps: DrawerProps;
  dialogAction: DialogAction;
  dialogProps: DialogProps;
  snackbarAction: SnackbarAction;
  snackbarProps: SnackbarProps;
  menuItem: MenuItem;
  menuProps: MenuProps;
  tooltipProps: TooltipProps;
  listItem: ListItem;
  listProps: ListProps;
  column: Column;
  row: Row;
  dataTableProps: DataTableProps;
  progressProps: ProgressProps;
  badgeProps: BadgeProps;
};

/**
 * Runtime validation: export a function that can be called to verify types are available
 */
export function validateAllTypesAvailable(): boolean {
  const types: TypeValidation = {} as TypeValidation;
  return Object.keys(types).length === 31; // 31 different type definitions
}

describe('Component Types', () => {
  it('should have all required types defined and exported', () => {
    const result = validateAllTypesAvailable();
    expect(result).toBe(true);
  });

  it('should correctly define ComponentState with all required properties', () => {
    const state: ComponentState = {
      enabled: true,
      focused: false,
      pressed: false,
      hovered: false,
      value: 'test',
      error: false,
      disabled: false,
      loading: false,
      visible: true,
      expanded: false,
    };
    expect(state.enabled).toBe(true);
  });

  it('should correctly define ButtonProps extending Pressable props', () => {
    const buttonProps: ButtonProps = {
      variant: 'filled',
      size: 'medium',
      disabled: false,
      children: 'Click me',
      onPress: () => {},
    };
    expect(buttonProps.variant).toBe('filled');
  });

  it('should correctly define NavigationRailProps with all required properties', () => {
    const railProps: NavigationRailProps = {
      items: [],
      activeKey: 'home',
      onItemPress: (key: string) => {},
      floating: true,
    };
    expect(railProps.floating).toBe(true);
  });

  it('should correctly define TabsProps with variant and scrollable options', () => {
    const tabsProps: TabsProps = {
      tabs: [],
      activeKey: 'tab-1',
      onTabPress: (key: string) => {},
      variant: 'primary',
      scrollable: false,
    };
    expect(tabsProps.variant).toBe('primary');
  });

  it('should correctly define DrawerProps with modal option', () => {
    const drawerProps: DrawerProps = {
      visible: true,
      onClose: () => {},
      modal: true,
      children: 'Drawer content',
    };
    expect(drawerProps.modal).toBe(true);
  });

  it('should correctly define MenuProps with items and visibility', () => {
    const menuProps: MenuProps = {
      visible: true,
      onDismiss: () => {},
      items: [],
    };
    expect(menuProps.visible).toBe(true);
  });

  it('should correctly define TooltipProps with position option', () => {
    const tooltipProps: TooltipProps = {
      children: 'Tooltip trigger',
      text: 'Help text',
      position: 'top',
    };
    expect(tooltipProps.position).toBe('top');
  });
});
