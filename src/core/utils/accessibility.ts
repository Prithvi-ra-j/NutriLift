/**
 * Accessibility Utilities
 * Helpers for creating accessible components that meet WCAG AA standards
 */

/**
 * Create an accessible label combining label text and description
 */
export function createAccessibleLabel(
  label: string,
  description?: string
): string {
  return description ? `${label}, ${description}` : label;
}

/**
 * Get ARIA role for a component type
 */
export function getAriaRole(componentType: string): string {
  const roleMap: Record<string, string> = {
    button: 'button',
    checkbox: 'checkbox',
    radio: 'radio',
    switch: 'switch',
    textinput: 'textbox',
    tab: 'tab',
    navigation: 'navigation',
    dialog: 'dialog',
    alert: 'alert',
    list: 'list',
    listitem: 'listitem',
    table: 'table',
    row: 'row',
    cell: 'cell',
  };

  return roleMap[componentType.toLowerCase()] || 'group';
}

/**
 * Create accessible state attributes for a component
 */
export interface AccessibleStateProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-disabled'?: boolean;
  'aria-busy'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-pressed'?: boolean | 'mixed';
  'aria-hidden'?: boolean;
  'aria-invalid'?: boolean;
  role?: string;
}

export function createAccessibleState(
  props: Partial<AccessibleStateProps>
): AccessibleStateProps {
  return {
    ...props,
  };
}

/**
 * Format disabled state for accessibility
 */
export function formatDisabledState(disabled: boolean): AccessibleStateProps {
  return {
    'aria-disabled': disabled,
  };
}

/**
 * Format loading state for accessibility
 */
export function formatLoadingState(loading: boolean): AccessibleStateProps {
  return {
    'aria-busy': loading,
  };
}

/**
 * Format error state for accessibility
 */
export function formatErrorState(
  error: boolean | string,
  errorId?: string
): AccessibleStateProps {
  if (!error) {
    return {};
  }

  return {
    'aria-invalid': true,
    'aria-describedby': errorId,
  };
}

/**
 * Keyboard navigation constants
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if a key press is a navigation key
 */
export function isNavigationKey(
  key: string
): key is (typeof KeyboardKeys)[keyof typeof KeyboardKeys] {
  return Object.values(KeyboardKeys).includes(key as any);
}

/**
 * Check if a key press is a submit key (Enter or Space)
 */
export function isSubmitKey(key: string): boolean {
  return key === KeyboardKeys.ENTER || key === KeyboardKeys.SPACE;
}

/**
 * Check if a key press is an escape key
 */
export function isEscapeKey(key: string): boolean {
  return key === KeyboardKeys.ESCAPE;
}

/**
 * Check if a key press is an arrow key
 */
export function isArrowKey(key: string): boolean {
  return (
    key === KeyboardKeys.ARROW_UP ||
    key === KeyboardKeys.ARROW_DOWN ||
    key === KeyboardKeys.ARROW_LEFT ||
    key === KeyboardKeys.ARROW_RIGHT
  );
}

/**
 * Get arrow direction from key
 */
export function getArrowDirection(
  key: string
): 'up' | 'down' | 'left' | 'right' | null {
  switch (key) {
    case KeyboardKeys.ARROW_UP:
      return 'up';
    case KeyboardKeys.ARROW_DOWN:
      return 'down';
    case KeyboardKeys.ARROW_LEFT:
      return 'left';
    case KeyboardKeys.ARROW_RIGHT:
      return 'right';
    default:
      return null;
  }
}

/**
 * Calculate tab index for roving tabindex pattern
 */
export function calculateTabIndex(
  isActive: boolean,
  allowInteraction: boolean = true
): number {
  if (!allowInteraction) {
    return -1;
  }
  return isActive ? 0 : -1;
}

/**
 * Get next focus index in a list with roving tabindex
 */
export function getNextFocusIndex(
  currentIndex: number,
  total: number,
  direction: 'forward' | 'backward' = 'forward'
): number {
  if (total <= 0) return -1;

  let nextIndex =
    direction === 'forward'
      ? (currentIndex + 1) % total
      : (currentIndex - 1 + total) % total;

  return nextIndex;
}

/**
 * Focus element by ID
 */
export function focusElementById(id: string): boolean {
  // In React Native, this would typically be handled by refs
  // This is a placeholder for web-like behavior
  return true;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string): void {
  // In React Native, this would use accessibility announcements
  // This is a placeholder for web-like behavior
  console.log('Screen reader announcement:', message);
}

/**
 * Common accessibility announcements
 */
export const A11yAnnouncements = {
  BUTTON_PRESSED: 'Button pressed',
  MENU_OPENED: 'Menu opened',
  MENU_CLOSED: 'Menu closed',
  DIALOG_OPENED: 'Dialog opened, press escape to close',
  DIALOG_CLOSED: 'Dialog closed',
  SNACKBAR_SHOWN: 'Notification shown',
  TAB_SELECTED: 'Tab selected',
  ITEM_SELECTED: 'Item selected',
  ERROR: 'Error',
  LOADING: 'Loading',
  SUCCESS: 'Success',
} as const;

/**
 * Calculate relative luminance for a color in hex format (#RRGGBB)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to rgb
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const standardHex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(standardHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate the contrast ratio between two hex colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verify if the contrast ratio meets WCAG AA standards
 * - Text requires 4.5:1 (3:1 for large text)
 * - UI components require 3:1
 */
export function meetsContrastGuidelines(
  ratio: number,
  type: 'text' | 'largeText' | 'ui' = 'text'
): boolean {
  switch (type) {
    case 'text':
      return ratio >= 4.5;
    case 'largeText':
    case 'ui':
      return ratio >= 3.0;
    default:
      return false;
  }
}

/**
 * Screen Reader Testing Helpers
 * Used in test environments to verify screen reader interactions
 */
export const ScreenReaderTestHelpers = {
  /**
   * Mock announcement function for Jest tests
   */
  mockAnnouncements: [] as string[],
  
  /**
   * Capture an announcement for testing
   */
  captureAnnouncement: (message: string) => {
    ScreenReaderTestHelpers.mockAnnouncements.push(message);
  },
  
  /**
   * Clear all captured announcements
   */
  clearAnnouncements: () => {
    ScreenReaderTestHelpers.mockAnnouncements = [];
  },
  
  /**
   * Check if a specific announcement was made
   */
  hasAnnounced: (message: string) => {
    return ScreenReaderTestHelpers.mockAnnouncements.includes(message);
  }
};

