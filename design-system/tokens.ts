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

export { colors, dayTypeColors, macroColors } from "./colors";
export type { ColorToken } from "./colors";
import { colors, dayTypeColors, macroColors } from "./colors";

// ─── Shape Tokens ─────────────────────────────────────────────────────────────

export { shape } from "./radii";
import { shape } from "./radii";

// ─── Typography Tokens ────────────────────────────────────────────────────────

export { typescale } from "./typography";
import { typescale } from "./typography";

// ─── Spacing Tokens ───────────────────────────────────────────────────────────

export { spacing } from "./spacing";
import { spacing } from "./spacing";

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



// ─── Macro colors ─────────────────────────────────────────────────────────────



// ─── Animation durations ─────────────────────────────────────────────────────

export { motion } from "./motion";
import { motion } from "./motion";

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
