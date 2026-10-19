# Bevel UI/UX — Full 545-Screen Visual Audit

## Current review status — 2026-10-11

- Full-frame visual sweep: **545/545 local archive images viewed** across 61 labeled contact sheets.
- OCR inventory: **545/545**.
- Native-resolution review: representative samples inspected across major families; **not all 545 canonical images have been opened individually at native resolution yet**.
- Canonical mapping: the local archive is shuffled, so its `screen_NNN` filenames have not been mapped one-to-one to `bevel-NNN.png` source IDs.
- **Implementation remains blocked** until the exact 545 canonical PNGs are individually reviewed, mapped, and recorded in `docs/BEVEL_545_SCREEN_REVIEW_LEDGER.csv`.

Read [`BEVEL_545_VISUAL_REVIEW_COMPLETION_REPORT.md`](./BEVEL_545_VISUAL_REVIEW_COMPLETION_REPORT.md) for the detailed visual findings, per-family design observations and adaptation decisions. The ledger distinguishes full-frame archive coverage from native-resolution verification; do not mark a canonical row complete based on OCR or contact-sheet presence alone.

## Why this file exists

The redesign must be grounded in the actual screenshot images, not only a summary or selected screenshots. The source collection contains 545 images, `screens/bevel-000.png` through `screens/bevel-544.png`. `docs/BEVEL_545_SCREEN_REFERENCE_MAP.csv` maps every source image to its catalog flow tag(s) and a conservative NutriLift-fit decision.

## Indexing warning

A separate local archive inspected during the initial visual pass is numbered `screen_001.png`–`screen_545.png`, but that archive is shuffled relative to the source catalog. For example, its first image is a “Pinned tags” settings screen. Never equate local archive number 001 with source catalog ID 000. Match images by actual content. The source map in this repository uses the canonical `bevel-NNN.png` IDs.

## Visual conclusions from the actual images

1. **Light theme is the baseline.** The screenshot archive is predominantly light: white/light-neutral canvases, dark text, gray supporting surfaces, black primary actions and restrained colored metric visualizations. Dark-mode examples exist, but “dark-first” is not supported by the dominant visual evidence. Treat dark mode as a coherent alternative theme.
2. **Clear vertical hierarchy.** Large screen title; muted supporting line; one main metric/action; then compact sections. The interface is data-rich but rarely makes every element equally loud.
3. **High-contrast primary CTA.** Focused forms and sheets commonly use a wide, black, pill-shaped bottom action with white text. Secondary actions sit above it or are lower-emphasis. Destructive actions use a distinct warm/red treatment rather than looking like the primary save action.
4. **Rounded neutral surfaces.** Cards and bottom sheets use large soft radii, light-gray inset areas, subtle shadows/edge contrast, and restrained dividers. Avoid thick outlines around every nested component.
5. **Selection is explicit.** Selected segmented controls/chips often invert to black background and white text; unselected options remain pale gray. State is visible through fill, text and shape—not color alone.
6. **Numeric hierarchy.** Large numbers and values are prominent; units, dates and explanatory labels are secondary. Use consistent tabular numerals for calories, grams, kg, durations and chart readouts.
7. **Metric visualizations are color-coded.** Rings/arc progress, small trend charts and breakdowns use stable per-metric colors. Reuse the visual principle, not Bevel’s health scores or thresholds.
8. **Sheets preserve context.** Food processing, item selection, action menus and editors can appear as overlays while leaving the underlying page perceptible. A handle and clear dismissal affordance identify the sheet. Keep the content focused.
9. **Food is a multi-step pipeline.** Entry modes converge on review; each item shows food identity, serving and nutrition; editable amounts/ingredients lead to recalculated values; search, barcode and saved-food paths converge on a clear save action. NutriLift should emphasize protein and portion accuracy and expose uncertainty.
10. **Workout logging is dense but direct.** Exercise library/search/filter, template construction, per-set values, supersets and live sessions are separate tasks. In-session rows favor fast input and visible completion state; post-workout summary is a distinct screen.
11. **Analytics use repeatable grammar.** Metric detail pages typically combine a large current value, range selector, chart, target/normal band and a breakdown. Missing data must remain distinct from zero.
12. **Forms and settings use row systems.** Configuration screens rely on clear row labels, current values, chevrons/toggles, restrained grouping and persistent Save/Done actions. Onboarding tends to ask focused questions step by step.
13. **State coverage matters as much as the happy path.** The 545 images include onboarding, loading/processing, empty, selection, edit, confirmation, error/help, alternate theme, settings and post-action states. Reproduce the state transitions rather than only the default screen.
14. **Do not copy iOS chrome literally.** The references use iOS status bars/home indicators and sheet behavior. NutriLift should adapt the same visual grammar to Expo/React Native and Android navigation, safe areas, keyboard and permissions.

## NutriLift adaptation matrix

| Reference flow | NutriLift target | Decision |
|---|---|---|
| Home dashboard/card grid | Daily calories/macros, protein, workout status, recovery check-in | Adapt strongly; do not invent sensor-derived scores |
| Quick-add/action sheet | Food, search, barcode, voice/text, weight, workout, recovery | Reuse the focused action-grid pattern |
| Food search / review / edit / detail | Food logging, serving editor, macro recalculation, recent/saved meals | Highest-priority visual reference |
| Nutrition goals and metric trends | Calorie/protein/macro targets, daily/weekly adherence | Adapt calculations; no copied “Nutrition Score” without a validated NutriLift model |
| Workout template / exercise library / active session | Existing workout plan and set logger | High-priority reference; preserve history and session state |
| Fitness summary / trend detail | Weight, body composition, protein adherence, training consistency | Reuse chart grammar; show real data and missing days |
| Recovery / sleep / stress | NutriLift’s manual recovery logs | Adapt layouts, label source as manual, do not imply wearable measurements |
| AI assistant / memory | NutriLift Coach | Adapt chat hierarchy and context prompts; send only necessary user data |
| Journal / mood / habit taxonomy | Existing recovery/supplement tracking only when appropriate | Selective; do not import unrelated Bevel taxonomy wholesale |
| CGM, Apple Watch, sleep alarm, source-priority screens | No assumed equivalent in NutriLift | Exclude unless implemented as real product features |
| Bevel paywall / subscription | No assumed equivalent | Exclude unless NutriLift product scope adds subscriptions |

## Mandatory visual-review ledger

Before implementation, create a ledger for all 545 canonical source images with these fields:

- Canonical source ID and image path.
- Screen purpose and flow.
- State: default, selected, loading, empty, error, editing, confirmation, completion, settings, or alternate theme.
- Visual anatomy: safe-area/header, hierarchy, spacing, surface/radius, typography, color, icons, chart, primary/secondary actions.
- Visible interactions and expected transition inferred from adjacent screens.
- NutriLift destination route and available supporting data.
- Decision: reuse pattern, adapt, reference only, or exclude.
- Confidence and unresolved questions.

**Do not mark a screenshot as visually reviewed merely because it appears in a contact sheet or OCR output.** Open the canonical image at readable resolution. Compare adjacent screenshots and confirm details before treating them as implementation requirements.

## Acceptance gate

- All 545 canonical images have been reviewed at readable resolution before finalizing screen selection.
- Every NutriLift screen spec cites the exact source image IDs that support its layout and states.
- Colors, typography, spacing, radii and CTA geometry are sampled from the actual images.
- Light theme is the reference baseline; dark theme is a deliberate, separately validated variant.
- No Bevel-only feature, sensor, score, permission flow, paywall or integration is represented as a NutriLift capability unless it actually exists.
- Screenshot comparisons are performed on the actual NutriLift target device; “pixel perfect” is not claimed without visual verification.

## Source

- https://github.com/ChakshuGautam/bevel-teardown
- https://github.com/ChakshuGautam/bevel-teardown/blob/main/docs/screen-catalog.md
- https://github.com/Prithvi-ra-j/NutriLift
