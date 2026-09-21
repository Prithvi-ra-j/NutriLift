/**
 * Material 3 Design Tokens — NutriLift Dark Theme
 *
 * Seed color: #00D4AA (Primary Teal)
 * Generated following M3 tonal palette spec for dark schemes.
 *
 * Usage:
 *   import { M3 } from "../../design-system/tokens";
 *   backgroundColor: M3.colors.surface
 */

// ─── Color Tokens ─────────────────────────────────────────────────────────────

export const colors = {
  // ── Backgrounds ──
  background:         "#0F0F13",   // Darkest layer — screen bg
  surface:            "#16161E",   // Cards, base surfaces
  surfaceVariant:     "#1E1E2A",   // Elevated cards, input fields
  surfaceContainer:   "#22222F",   // Chips, pills, tags
  surfaceContainerHigh: "#282838", // Hover / pressed states
  inverseSurface:     "#E8E8F0",   // Light surface (toasts, snackbars)

  // ── Primary (Teal) ──
  primary:            "#00D4AA",   // CTAs, active icons, progress
  onPrimary:          "#001A14",   // Text/icons on primary
  primaryContainer:   "#003829",   // Chip/badge backgrounds, subtle fills
  onPrimaryContainer: "#7FF5DB",   // Text on primaryContainer

  // ── Secondary (Blue — Nutrition / Protein) ──
  secondary:          "#7CACF8",
  onSecondary:        "#00235F",
  secondaryContainer: "#09397A",
  onSecondaryContainer: "#D5E3FF",

  // ── Tertiary (Purple — Workout Volume) ──
  tertiary:           "#B69DF8",
  onTertiary:         "#27006C",
  tertiaryContainer:  "#3E0096",
  onTertiaryContainer: "#E8DEFF",

  // ── Error (Red) ──
  error:              "#FF5449",
  onError:            "#690005",
  errorContainer:     "#930006",
  onErrorContainer:   "#FFDAD6",

  // ── Warning (Amber) ──
  warning:            "#FFB800",
  warningContainer:   "#3D2800",
  onWarningContainer: "#FFDE9C",

  // ── Success (Green) ──
  success:            "#00C875",
  successContainer:   "#003920",
  onSuccessContainer: "#7EFFC4",

  // ── Text ──
  onBackground:       "#E8E8F0",   // Primary text
  onSurface:          "#E8E8F0",   // Primary text on surfaces
  onSurfaceVariant:   "#909090",   // Secondary / helper text
  onSurfaceMuted:     "#8080A0",   // Placeholder, disabled

  // ── Borders ──
  outline:            "#2E2E3F",   // Card borders, dividers
  outlineVariant:     "#3A3A50",   // Subtle separators
} as const;

export type ColorToken = keyof typeof colors;

// ─── Shape Tokens ─────────────────────────────────────────────────────────────

export const shape = {
  // M3 shape scale
  none:       0,
  extraSmall: 4,
  small:      8,
  medium:     12,
  large:      16,
  extraLarge: 28,
  full:       999,
} as const;

// ─── Typography Tokens ────────────────────────────────────────────────────────

export const typescale = {
  // Display — BebasNeue for athletic identity
  displayLarge:   { fontFamily: "BebasNeue_400Regular", fontSize: 40, letterSpacing: 1 },
  displayMedium:  { fontFamily: "BebasNeue_400Regular", fontSize: 32, letterSpacing: 1 },
  displaySmall:   { fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 0.5 },

  // Headlines — DMSans bold
  headlineLarge:  { fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: 0 },
  headlineMedium: { fontFamily: "DMSans_700Bold", fontSize: 18, letterSpacing: 0 },
  headlineSmall:  { fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 0 },

  // Titles
  titleLarge:     { fontFamily: "DMSans_700Bold", fontSize: 15, letterSpacing: 0 },
  titleMedium:    { fontFamily: "DMSans_500Medium", fontSize: 14, letterSpacing: 0.1 },
  titleSmall:     { fontFamily: "DMSans_500Medium", fontSize: 13, letterSpacing: 0.1 },

  // Body
  bodyLarge:      { fontFamily: "DMSans_400Regular", fontSize: 14, letterSpacing: 0.15 },
  bodyMedium:     { fontFamily: "DMSans_400Regular", fontSize: 13, letterSpacing: 0.25 },
  bodySmall:      { fontFamily: "DMSans_400Regular", fontSize: 12, letterSpacing: 0.4 },

  // Labels
  labelLarge:     { fontFamily: "DMSans_500Medium", fontSize: 13, letterSpacing: 0.2 },
  labelMedium:    { fontFamily: "DMSans_500Medium", fontSize: 12, letterSpacing: 0.1 },
  labelSmall:     { fontFamily: "DMSans_500Medium", fontSize: 12, letterSpacing: 0.1 },
} as const;

// ─── Spacing Tokens ───────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

// ─── Elevation (Surface Tint) ──────────────────────────────────────────────────
// M3 uses tinted overlays instead of drop shadows on dark surfaces.
// These are the tint opacity values for each level.

export const elevation = {
  level0: "transparent",           // 0% tint — base surface
  level1: "0A",                    // 5% primary tint — standard card
  level2: "14",                    // 8% primary tint — elevated modal content
  level3: "1F",                    // 12% primary tint — nav bar
} as const;

// ─── Named convenience — tinted surface colors ───────────────────────────────

export const surfaces = {
  /** Level 0 — screen backgrounds */
  base:     colors.background,
  /** Level 1 — standard cards */
  card:     colors.surface,
  /** Level 2 — elevated / nested cards */
  elevated: colors.surfaceVariant,
  /** Level 3 — modals, nav bars */
  overlay:  colors.surfaceContainer,
} as const;

// ─── Day type accent colors ───────────────────────────────────────────────────

export const dayTypeColors: Record<string, string> = {
  "Push A":  "#FF6B6B",
  "Push B":  "#FF8C6B",
  "Pull A":  "#4ECDC4",
  "Pull B":  "#45B7D1",
  "Legs A":  "#B69DF8",
  "Legs B":  "#9B7EF0",
  "Cardio":  "#FF5449",
  "Marathon": "#FF5449",
  "Rest":    "#909090",
};

// ─── Macro colors ─────────────────────────────────────────────────────────────

export const macroColors = {
  protein: colors.secondary,          // Blue
  carbs:   "#4ADE80",                 // Green
  fat:     "#FBBF24",                 // Amber
  calories: colors.primary,           // Teal
} as const;

// ─── Animation durations ─────────────────────────────────────────────────────

export const motion = {
  short1:   50,
  short2:   100,
  short3:   150,
  short4:   200,
  medium1:  250,
  medium2:  300,
  medium3:  350,
  medium4:  400,
  long1:    450,
  long2:    500,
} as const;

// ─── Export namespace ─────────────────────────────────────────────────────────

export const M3 = {
  colors,
  shape,
  typescale,
  spacing,
  elevation,
  surfaces,
  dayTypeColors,
  macroColors,
  motion,
} as const;

export default M3;
