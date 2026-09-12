/**
 * Tailwind/NativeWind Class Name Utilities
 * Helper functions for composing and managing Tailwind classes
 */

/**
 * Merge class names with conditional logic
 */
export function cn(
  ...classes: (string | undefined | null | false | Record<string, boolean>)[]
): string {
  return classes
    .reduce<string[]>((acc, cls) => {
      if (!cls) return acc;
      if (typeof cls === 'string') {
        return [...acc, cls];
      }
      if (typeof cls === 'object') {
        return [
          ...acc,
          ...Object.entries(cls)
            .filter(([_, shouldInclude]) => shouldInclude)
            .map(([className]) => className),
        ];
      }
      return acc;
    }, [])
    .filter(Boolean)
    .join(' ');
}

/**
 * Create responsive class variants
 */
export function responsive(
  base: string,
  variants?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  }
): string {
  const classes = [base];
  if (variants?.sm) classes.push(`sm:${variants.sm}`);
  if (variants?.md) classes.push(`md:${variants.md}`);
  if (variants?.lg) classes.push(`lg:${variants.lg}`);
  if (variants?.xl) classes.push(`xl:${variants.xl}`);
  return classes.join(' ');
}

/**
 * Create state-based class variants
 */
export function withStates(
  base: string,
  states?: {
    hover?: string;
    focus?: string;
    active?: string;
    disabled?: string;
    error?: string;
  }
): string {
  const classes = [base];
  if (states?.hover) classes.push(`hover:${states.hover}`);
  if (states?.focus) classes.push(`focus:${states.focus}`);
  if (states?.active) classes.push(`active:${states.active}`);
  if (states?.disabled) classes.push(`disabled:${states.disabled}`);
  if (states?.error) classes.push(`error:${states.error}`);
  return classes.join(' ');
}

/**
 * Create variant-based classes
 */
export function variantClasses<T extends string>(
  variant: T,
  variants: Record<T, string>,
  base?: string
): string {
  return cn(base, variants[variant]);
}

/**
 * Color utility classes
 */
export const colorClasses = {
  // Primary
  'bg-primary': 'bg-primary',
  'text-primary': 'text-primary',
  'border-primary': 'border-primary',

  // Secondary
  'bg-secondary': 'bg-secondary',
  'text-secondary': 'text-secondary',
  'border-secondary': 'border-secondary',

  // Error
  'bg-error': 'bg-error',
  'text-error': 'text-error',
  'border-error': 'border-error',

  // Success
  'bg-success': 'bg-success',
  'text-success': 'text-success',
  'border-success': 'border-success',

  // Surface
  'bg-surface': 'bg-surface',
  'text-surface': 'text-surface',
  'border-surface': 'border-surface',
} as const;

/**
 * Spacing utility classes
 */
export const spacingClasses = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
} as const;

/**
 * Create gap classes
 */
export function gap(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const gapMap = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };
  return gapMap[size];
}

/**
 * Create padding classes
 */
export function padding(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const paddingMap = {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  return paddingMap[size];
}

/**
 * Create margin classes
 */
export function margin(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const marginMap = {
    xs: 'm-1',
    sm: 'm-2',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  };
  return marginMap[size];
}

/**
 * Combine padding and margin directionally
 */
export function paddingX(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const map = {
    xs: 'px-1',
    sm: 'px-2',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  };
  return map[size];
}

export function paddingY(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  const map = {
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
  };
  return map[size];
}

/**
 * Border radius utilities
 */
export const borderRadiusClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

/**
 * Opacity utilities for disabled state
 */
export const opacityClasses = {
  full: 'opacity-100',
  high: 'opacity-87',
  medium: 'opacity-60',
  disabled: 'opacity-38',
} as const;
