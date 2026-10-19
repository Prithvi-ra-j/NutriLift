# Bevel 545-Screen Visual Review — Status and Findings

**Date:** 2026-10-11  
**NutriLift:** https://github.com/Prithvi-ra-j/NutriLift  
**Reference:** https://github.com/ChakshuGautam/bevel-teardown  
**Canonical source catalog:** `docs/screen-catalog.md`, IDs `bevel-000.png`–`bevel-544.png`.

## Review status (be precise)

- **545/545 full-frame visual sweep: complete.** All extracted images were viewed across 61 labeled 3×3 contact sheets. Each tile included the local archive ID, OCR excerpt and OCR-derived flow label.
- **545/545 OCR inventory: complete.** Local inventory includes image dimensions, brightness bucket, likely flow, relevance and extracted text.
- **15 native-resolution screens inspected:** food ingredient editing, nutrition goals, appearance, exercise library, guided workout generation, journal customization, issue reporting, onboarding identity, photo-based food description, dark-mode metric detail, active workout, food search and home dashboard families.
- **545/545 individual native-resolution inspections: NOT complete.** Contact sheets provide broad coverage but cannot verify every small control, exact spacing or state detail. **Do not begin UI implementation yet.**
- **Exact mapping from shuffled archive files to canonical source IDs: NOT resolved.** The local `screen_001.png`–`screen_545.png` archive is shuffled relative to `screens/bevel-000.png`–`bevel-544.png`. Local numbers must not be treated as canonical IDs.

This report records a completed broad visual sweep, not a claim of full pixel-level inspection. The implementation gate stays closed until all 545 canonical PNGs have been opened at readable resolution and mapped to evidence notes.

## What the image set actually looks like

### Canvas, hierarchy and surfaces
- Screens are 1179 × 2556 px portrait captures (approximately 393 × 852 logical points at 3×).
- The dominant canvas is pale cool gray; white cards/sheets sit above it with soft elevation, large rounded corners and low-contrast dividers.
- Inspected examples use roughly 14–16 pt side insets and a wide bottom CTA around 54–60 pt high. These are starting estimates, not a complete token measurement.
- Screen titles and key values are dark/high contrast; descriptions, units and timestamps are muted gray. Numeric values use strong hierarchy.
- Focused tasks commonly use a wide black pill CTA with white text. Disabled CTAs stay in place but become low contrast. Destructive actions use a separate orange/red treatment.
- Sheets have rounded upper corners and a centered handle; dimmed background content preserves context. Avoid outlining every nested component.

### Theme and color
- **Light mode is the baseline.** Dark mode is a designed alternative, especially for sleep/metric detail, not a reason to make NutriLift dark-first.
- Accent colors encode distinct metric families (warm yellow/orange, green, blue/purple) and macro types. Preserve semantic consistency; do not import Bevel’s metric meanings, thresholds or scores.
- Selected chips/segments commonly invert to dark fill and light text. Selection must be visible through fill, shape and text, not color alone.

### Food capture → review → edit
- Capture/describe screens use a sparse headline, optional description, explicit capture/import actions and one bottom Continue action. Attached photos are removable thumbnails in a dark strip.
- Search is a sheet with Cancel/Add, Search/My Foods tabs, a large search field, selected-item area, date-grouped recents, food images, serving/nutrition metadata and explicit add controls.
- Add is disabled until a valid selection exists. Keep that disabled/enabled transition.
- Food details foreground name, serving, macros and calories. Ingredient rows have a food image, name, amount and chevron; the add-ingredient row is visually distinct (dashed).
- Quantity editing uses a dedicated numeric keypad/sheet with unit choices and Done. Ingredient records can be opened and edited independently. Save is the primary action; Remove/Edit remain secondary.
- Recipe/photo/barcode/search paths converge on a review stage before logging. Preserve processing, ready-for-review, empty and error states; show uncertainty and permit correction before committing.

### Nutrition goals and nutrients
- The structure is **Macronutrient Goals**, **Target Nutrients** (“meet or exceed”), and **Limit Nutrients** (“stay near or below”), not one flat list.
- Empty goal cards explain the feature and provide a clear Set/Add goals action. Skeletons should communicate missing data, not fake zero-valued records.
- Macro colors stay consistent across goals, overview and detail. Per-nutrient configuration is a focused sheet for tracking intent, target/limit amount, quick-add amount and Save.
- Nutrient details separate progress from “Today's Entries,” which can combine food-derived contributions and manual logs. Show sources/timestamps where relevant.

### Home, workout and analytics
- Home starts with date/profile context, small status pills, a primary metrics card and supporting cards. Long insights use a short headline and a truncation/expand affordance. The bottom navigation uses a floating surface with a central quick-add action.
- Home edit mode is distinct from read mode: add/remove/reorder cards and Save. NutriLift should only show metrics it can actually calculate.
- Exercise library uses search, muscle/equipment filter pills, alphabetized rows, small exercise illustrations, info affordances and selected/Add states.
- Workout templates group exercise name/equipment, set rows, weight/reps or duration, remove, add-set and superset actions. Reordering is a separate mode.
- Live workout keeps elapsed time and pause/end controls visible. Completed sets have a clear state; editing a template and logging a live session are distinct experiences.
- Metric detail uses current value/date/status, alternate metric chips, chart, period selector, and breakdown/analysis. Show missing history as missing, never as zero.

### Journal, onboarding, settings and feedback
- Journal customization uses category tabs, tag icons, explanatory subtitles, settings affordances and switches. Tag time/pinning can be configured in a focused sheet.
- Mood logging is staged: feeling → optional contributing areas/details → save. Onboarding asks one question at a time with a progress line, generous whitespace, large choice cards and a clear bottom CTA.
- Settings are grouped rows with icons, values/toggles and chevrons. Permissions/integration failures explain a next action.
- Empty/loading/error/success/confirmation states are first-class: no foods, no goals, no journal logs, no prior workout, processing, generation, failed glucose read, disconnected integration, issue report and destructive confirmation were all seen in the sweep.

## NutriLift adaptation decisions

| Family | Decision | Guardrail |
|---|---|---|
| Food capture/search/review/edit | Highest priority; adapt | Keep NutriLift ingestion modes, accurate serving conversions, recalculation and review-before-save. |
| Nutrition overview/goals/trends | High priority; adapt | Real calories/protein/macros and real data only; transparent progress and no-data states. |
| Workout library/template/live session | High priority; adapt | Aligned set entry, clear edit/reorder modes, durable session state and safe completion. |
| Home dashboard/cards | High priority; adapt | Use actual NutriLift metrics; do not fabricate wearable-derived scores. |
| Onboarding | Selective | Only ask for profile/goals/preferences that improve NutriLift. |
| Journal/mood | Selective | Only use logs that exist and serve the nutrition/fitness product. |
| CGM, HealthKit/watch sync, sleep alarm, Bevel paywall | Exclude unless real NutriLift features exist | Do not create dead UI or imply unsupported capabilities. |
| Assistant/memory | Selective | Only expose behavior supported by NutriLift Coach. |

## Implementation gate

- [x] Full-frame visual sweep of all 545 archive images.
- [x] OCR inventory of all 545 archive images.
- [x] Native-resolution spot checks across major families.
- [x] Light-first conclusion verified against actual screenshots.
- [x] Archive-order mismatch documented.
- [ ] Open all 545 **canonical** source PNGs at readable/native resolution.
- [ ] Map each inspected image to its exact source ID and record purpose, state, controls, visual anatomy and NutriLift destination.
- [ ] Compare adjacent states and finish the evidence-backed design-system token sheet.
- [ ] Only then implement.

## Artifacts
- `docs/BEVEL_ALL_545_VISUAL_AUDIT.md` — design-system findings and adaptation guidance.
- `docs/BEVEL_545_SCREEN_REFERENCE_MAP.csv` — canonical source IDs, source paths and flow tags.
- `docs/BEVEL_545_SCREEN_REVIEW_LEDGER.csv` — per-canonical-screen audit status and required evidence fields.
- `docs/AGENT_UI_UX_REDESIGN_INSTRUCTIONS.md` — mandatory pre-implementation gate.
