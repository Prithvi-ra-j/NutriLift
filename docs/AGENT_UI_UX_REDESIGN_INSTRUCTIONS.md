# Agent instructions: Execute the Bevel-inspired NutriLift redesign

## Required first read
Read `docs/BEVEL_UI_UX_REDESIGN_BLUEPRINT.md` in full before changing any code. It is the scope and screen-mapping specification.

## Source references
- NutriLift: https://github.com/Prithvi-ra-j/NutriLift
- Bevel screen catalog: https://github.com/ChakshuGautam/bevel-teardown/blob/main/docs/screen-catalog.md
- Bevel screenshot files: `screens/bevel-NNN.png` in https://github.com/ChakshuGautam/bevel-teardown
- NutriLift screen routes and core services are under `app/`, `components/`, `lib/`, `design-system/`, and `app/modals/`.

## Mission
Make NutriLift feel meticulously designed in the same broad visual language as Bevel: measured spacing, precise type hierarchy, quiet dark surfaces, clear data visualization, polished sheets and meaningful feedback. The NutriLift use case is nutrition + workout logging, body progress and AI coaching, so don't reproduce unrelated Bevel-only health capabilities.

## Required workflow
1. Work on a separate branch named `redesign/bevel-inspired-ui`; don't commit a sweeping rewrite to the default branch.
2. Inspect root layout, navigation, fonts, theme tokens, shared production components and the exact route before implementing anything.
3. Capture baseline screenshots for Home, Nutrition, Workout, Coach, Progress and More using a representative Android viewport. Also capture food-log and barcode confirmation modals.
4. Inspect the Bevel PNGs identified by the blueprint; use the screen catalog to map exact state/flow. Record measured design tokens (color, type, insets, spacing, radii, icon styling). Separate observation from estimates.
5. Write an implementation checklist with touched paths, component changes, risks, tests and screenshot checks.
6. Implement the token/component layer first, then Home as the golden screen. Compare and correct it before moving to other screens.
7. Continue in this order: Nutrition overview → quick-add → food ingestion/review → food detail/history → Progress and metric details → active workout/completion → Coach → More/settings → reports.
8. Preserve SQLite/Drizzle semantics, local-first writes, Zustand state, routes, existing food source metadata, workout history and report behavior. No unrelated migrations.
9. Keep unknown data distinct from zero; no fake demo data; no fabricated Bevel-style scores. Manually logged recovery data must not look like wearable sensor readings.
10. Every redesigned control must work and have loading/empty/error/disabled/success behavior as appropriate. Preserve form data and retryability on failure.
11. Test smaller Android widths, safe areas, keyboard overlap, accessible names/roles, and bottom navigation overlap.
12. After each phase run TypeScript, relevant Jest tests and Expo/device diagnostics. Capture updated screenshots and compare side by side.
13. Report changed files, behavior preserved, tests run, visual comparisons actually performed and known gaps. Do not claim “pixel perfect” unless verified against screenshots.

## Non-negotiable
- Do not use Bevel screenshots as app backgrounds or ship them as assets.
- Do not add Apple Health/Watch, CGM, glucose, paywall, physiological scores, sleep alarms or source-priority features absent from NutriLift.
- Do not fake a Nutrition Score. Use transparent target adherence and measured statistics only.
- Do not replace real query/calculation flows with hardcoded values.
- Don't modify many screens in one giant unreviewed pass.
