# NutriLift Bevel-inspired UI/UX redesign blueprint

A detailed, screen-by-screen plan for adapting the visual language and interaction patterns from the Bevel iOS teardown to NutriLift's actual nutrition, workout, progress, recovery, and AI coaching workflows.

**Repository:** https://github.com/Prithvi-ra-j/NutriLift  
**Reference teardown:** https://github.com/ChakshuGautam/bevel-teardown  
**Reference catalog:** https://github.com/ChakshuGautam/bevel-teardown/blob/main/docs/screen-catalog.md

## Goal and constraints

Match Bevel’s visual quality and UI grammar—dark layered surfaces, precise typography, restrained accents, data-rich cards, crisp charts, consistent spacing, well-designed bottom sheets, clear empty states and purposeful motion—while adapting the details to NutriLift. Do not copy screens that have no NutriLift equivalent.

NutriLift is Expo SDK 54 / React Native / TypeScript / Expo Router, with local-first SQLite/Drizzle, Zustand, food logging, workout sessions, body-composition records, recovery logs, AI coaching, and reports. Preserve routes, data contracts, offline behavior, and real calculations. No hardcoded demo data. Do not display unknown values as zero or present manual recovery check-ins as wearable sensor readings.

## Reference screen map

| Bevel screen IDs | Pattern | NutriLift target | Priority |
|---|---|---|---|
| 050, 500, 413, 541; empty 047 | Home dashboard, alternate/empty state | Home daily calories/macros, workout, recovery check-in, weekly adherence | P0 |
| 402–409 | Editable card dashboard | Future Home-card customization | P2 |
| 051, 240 | Quick-add action grid | Quick log sheet for food, barcode, voice, workout, weight, recovery | P0 |
| 052–060, 078–091, 120–124 | Describe/search/capture/barcode/review food | Existing text/voice/barcode/search flows | P0 |
| 061–077, 082–084 | Food quantity, ingredient and nutrient edit | Confirm food, portion conversion, macro editing | P0 |
| 318–324 | My Foods / recent / favorites / recipes | Recent and repeat foods, favorites only if persisted | P1 |
| 325–336 | Recipe import | Optional ingredient-level parsing if supported | P2 |
| 313–317, 395–401 | Nutrition overview and trends | Daily nutrition and calorie/protein trend UI | P0 |
| 339–350, 363–367, 507–511 | Goal setup/edit | Editable calorie and macro targets | P1 |
| 351–356, 371, 374, 377 | Nutrient goals | Optional micronutrients only when supported by the database | P2 |
| 357–362, 368–380 | Nutrient detail and contributing entries | Protein/calorie detail with source entries | P1 |
| 390–394 | Per-meal detail/action menu | Meal summary, edit/repeat/delete | P1 |
| 460–478, 480, 502 | Fitness summary, heatmap, trend charts | Progress overview: workouts, weight, nutrition, recovery | P0 |
| 264–272, 466–475, 486–489, 503 | Metric drilldowns and range chips | Weight/protein/calorie/workout/recovery trends | P1 |
| 214–225 | Active workout session | In-workout set logging and completion flow | P1 |
| 220–223, 252–263 | Workout completion and activity details | Session summary with actual recorded values | P1 |
| 153–165, 184–203, 211–213 | Workout template/exercise editing | Existing exercise/sets/reps/weight plans | P1 |
| 274–275, 276–299, 310–312 | Recovery/sleep/stress detail | Manual sleep, energy, soreness, stress, HRV history where recorded | P1 |
| 092–108 | Assistant / chat / contextual prompts | AI Coach opening state, messages and actions | P1 |
| 109–119 | Assistant personalization/memory | Future only if preferences/memory are actually persisted | P2 |
| 490–492, 496–499, 504–515 | Settings, appearance, goals, units | More hub, profile, targets, units, theme, notifications | P1 |
| 493 | Paywall | Do not copy unless NutriLift adds subscriptions | Exclude |
| 381–389, 527, 539–540 | CGM integration | No current equivalent | Exclude |
| 529–538 | Wearable source priority | No current equivalent absent sensor integration | Exclude |
| 542–544 | Widgets | Future concept after core UX stabilizes | P3 |

The Bevel screenshot ids refer to the teardown catalog from the October 2025 build. Verify geometry and exact styles against the PNG before coding. The reference set contains commercially copyrighted app screenshots; use them for design study only, not as shipped app assets.

## Information architecture

Keep the existing primary routes and improve the design before changing navigation:
1. Home — today's at-a-glance view.
2. Nutrition — day-specific meal ledger and macro progress.
3. Workout — plan, exercise list and active session.
4. Coach — AI conversation.
5. Progress — weekly/monthly trends.
6. More — body stats, recovery, supplements, reports, account and settings.

Use one shared quick-log bottom sheet reachable from Home and Nutrition. Do not blindly replace the current tabs with Bevel’s navigation. Use bottom sheets for quick actions and short choices; use full-screen routes for complex forms. Preserve scroll position, dates, drafts and workout state when returning from a modal.

## Global design system

Implement production components under `components/ui/` and centralize the tokens. Current colors below should be **measured from chosen reference screenshots** before being treated as final; avoid inventing values and claiming they came from Bevel.

### Semantic token roles
- `background`, `surface`, `surfaceElevated`, `surfaceMuted`, `borderSubtle`
- `textPrimary`, `textSecondary`, `textTertiary`
- `accentPrimary`, `accentCalories`, `accentProtein`, `accentCarbs`, `accentFat`
- `success`, `warning`, `danger`, `info`

Create a dark-first theme. Implement light theme deliberately only if the app supports it. Macro colors must be consistent across all routes. Do not use color alone to convey state.

### Typography
- Verify DM Sans and display font loading in the root layout before relying on them.
- Shared roles: display, headline, title, body, label, caption, numericLarge, numericMedium.
- Use tabular numerals for calories/grams/weight if supported.
- Make value > label > unit/context hierarchy clear; keep units secondary.
- Avoid tiny all-caps labels everywhere.

### Spacing and shape
Use a consistent 4/8/12/16/20/24/32 spacing scale as a starting point and calibrate against screenshots. Main screen margins, card padding, radius and section gaps should be consistent. Prefer surface contrast over heavy shadows. Not every value belongs inside a pill.

### Shared primitives
- `ScreenScaffold`, `ScreenHeader`, `SectionHeader`
- `SurfaceCard` with default/hero/inset/interactive variants
- `PrimaryButton`, `SecondaryButton`, `IconButton`
- `SegmentedControl`, `DateStrip` / `DateNavigator`
- `ProgressRing` / `MacroRing`, `MacroBar`, `MetricRow`, `TrendChart`
- `MealSection`, `FoodRow`, optional source/quality indicator only when backed by data
- `BottomSheet`, `ActionGridSheet`
- `EmptyState`, `ErrorState`, `Skeleton`, snackbar/toast
- `FormField`, `ChoiceChip`, `UnitValueInput`, `StateBadge`

Refactor as each screen is redesigned; avoid a destructive, app-wide rewrite.

## Screen-by-screen specification

### A. Home dashboard
**Route:** `app/(tabs)/index.tsx`  
**References:** Bevel 050, 500, 413, 541; empty state 047; optional editable cards 402–409.  
**Priority:** First screen / P0.

**Purpose:** within three seconds answer: calories consumed, protein left, today's training status, and next useful action.

**Layout, in order**
1. Compact safe-area header: greeting/date, optionally profile/settings only if route exists. Use the user's local calendar date.
2. Hero nutrition summary: calories eaten / goal, remaining or over-goal state; protein consumed / target and grams remaining are the prominent numbers. Carbs and fat are supporting bars/rows. Use DB-backed values and saved target values.
3. One macro composition visualization plus compact legend. Don't duplicate identical data in multiple rings/bars.
4. Today's training card: session name, planned/in-progress/completed/rest status. CTA changes with state: Start, Resume, View session.
5. Recovery check-in card showing manually logged sleep, energy, soreness and stress if present. Label sources plainly. Missing values remain “Not logged”, not zero.
6. Compact 7-day protein/adherence strip with legend. “No log” differs from “target missed”; tap date to open that day.
7. Optional recent foods/last workout, only 2–3 entries.
8. Persistent navigation and one clear add action.

**Behavior**
- Pull to refresh; skeleton only during initial load.
- Offline state should not hide local data.
- Tap calories/protein -> Nutrition detail; workout -> Workout; recovery -> check-in.
- Quick-add opens the shared action grid.
- Keep card interaction affordances consistent; noninteractive cards should not masquerade as buttons.
- Error state has retry while retaining last known local data.

**Acceptance**
- No wall of equal-weight cards.
- No invented sensor scores.
- No overflow or text collisions on a small Android viewport.
- Tab bar does not cover scroll content.

### B. Nutrition overview / daily ledger
**Route:** `app/(tabs)/nutrition.tsx`  
**References:** 313–317, 395–401, 052–060, 120–124, 390–394.  
**Priority:** P0.

**Layout**
1. “Nutrition” header with selected date and only working actions.
2. Horizontal week/date navigator, clear selected state, “Today” shortcut for history, local-calendar dates.
3. Summary: calories eaten / target / remaining, protein emphasized, carbs and fats secondary, macro breakdown.
4. Breakfast/Lunch/Snacks/Dinner sections. Header shows item count and subtotal calories, optional protein subtotal. Empty meal has light “Add food” action.
5. Food row shows name, portion, calories and protein; avoid cramped four-macro rows.
6. One prominent add-food action that never covers the bottom meal or tabs.
7. Optional 7D/30D selector for trends, not a chart overload inside the meal list.

**Behavior**
- Food tap opens detail/edit; overflow includes edit/repeat/delete only if implemented.
- Delete has confirmation and ideally undo/snackbar.
- Changing date reloads totals and meal logs consistently.
- Separate loading/error/empty meal/actual zero-calorie states.

### C. Quick-add bottom sheet
**References:** 051, 240.  
**Priority:** P0.

- Native-style dark sheet with handle, compact title “Log something” and close button.
- Responsive 2-column/3-column action grid, large hit areas, consistent icons/labels.
- Actions where currently supported: Describe/type food, Search food, Scan barcode, Voice input, Add custom food, Log workout/activity, Log body weight, Recovery check-in, Supplements.
- Separate Food from Fitness & Body using small section captions.
- Each action must route to existing working screen; pass meal/date context explicitly.
- If a native path is unavailable, show an honest disabled state rather than silently doing nothing.
- Closing preserves prior screen and scroll state.

### D. Describe / text / voice food logging
**Route:** `app/modals/log-food.tsx`, `voice-input.tsx`.  
**References:** 052–060, 085–088, 102–105; selected/search chips 120–124.  
**Priority:** P0.

**Entry**
- Title “Add food” / “Describe your meal”.
- Meal choice pills Breakfast/Lunch/Snack/Dinner, editable and preselected from context/time.
- Large natural language input with one example (“2 eggs, 2 rotis and a cup of dal”).
- Type/Voice/Paste modes only if operational.
- Main CTA “Review foods”, disabled/loading state.

**Parsing**
- Keep typed input during processing.
- Inline “Understanding your meal…” status.
- On parser/AI failure, retain text and let user enter manually.
- Never claim image parsing ran if no image workflow exists.

**Review**
- Editable item rows: name, portion, kcal, protein, carbs, fat.
- Show confidence/provenance only if parser provides meaningful data.
- Edit/remove each row; add another.
- Summary with total kcal/protein and optional carbs/fat.
- Change meal/date if route/schema supports it.
- Main commit action “Save foods”.
- After save, update local totals and return with success feedback.

**Correctness**
- Null quantity is not exact gram precision.
- Distinguish parse failure from zero nutrition.
- Don't save unknown nutrition as a successful 0 kcal / 0 protein record without a clear needs-review/manual-entry state.
- Preserve source/raw input metadata.

### E. Search / barcode / food confirmation
**References:** 078–091, 120–124, 061–077, 318–324.  
**Routes:** barcode scanner and nutrition-card modal.  
**Priority:** P0/P1.

**Search list**
- Search input top with clear control.
- Recent/frequent foods only when there is actual history.
- Food result: title, serving baseline, kcal + protein, data-quality/source indicator only where sourced.
- Consistent behavior: row opens detail or selects item, not a confusing mix.
- Multi-select chips and sticky confirmation if supported.
- Empty state supports manual add; loading is distinct from no results.

**Barcode confirmation**
- Product/brand, source badge, quality warnings, quantity + unit.
- If values are per 100g, label that clearly.
- Amount edits recalculate actual macros immediately.
- Meal selector and save.
- Don't assume barcode data is accurate; preserve current dataQuality/warnings/source.

**Food detail/edit**
- Name and source; portion stepper/input; valid unit conversions only.
- Macro summary per actual portion.
- Micronutrients shown only if values exist.
- Editing catalogue values requires a real override/permission model.
- Save/cancel distinct; validation failure retains edits.

### F. Meal detail / history / repeat
**References:** 318–324, 390–394.  
**Priority:** P1.

- Header with meal name/date/type, optional recorded photo.
- Calories, protein, carbs, fat totals; item list and portions.
- Actions: edit, repeat/duplicate, save reusable meal, delete, photo only when implemented.
- Recent/Favorites/Saved-meal tabs only when persistence is real.
- Repeat makes new log IDs and never changes the historical source entry.
- Don't invent a “Nutrition Score” or “Food Quality Score”; use transparent target coverage or protein contribution.

### G. Nutrition targets setup/edit
**References:** 339–350, 363–367, 507–511.  
**Priority:** P1; plan the design early.

**Flow**
1. Goal intent (cut/maintain/gain/custom only where supported).
2. Daily calorie target, with manual vs estimated source clearly labelled.
3. Protein target in grams, with recommendation explanation only if backed by a deterministic rule; always allow manual override.
4. Carbs/fats targets.
5. Macro lock/rebalance only if the math is implemented and explained.
6. Preview daily targets / remaining values.
7. Save with validation and cancellation/reset.

Use clear units next to the values, show derived vs manually entered values, validate bad ranges/rounding, persist locally first, reflect across Home/Nutrition/Coach without restart.

### H. Macro detail / trends
**References:** 357–362, 368–380, 395–401, 264–272, 466–475, 486–489, 503.  
**Priority:** P1.

Build Protein detail first:
- Consumed / target, remaining grams, progress visualization.
- 7D/30D/90D only when history exists.
- Daily protein chart with target line and selected date/value.
- Summary: average, target-met days, logging coverage; explicitly show range and denominator.
- Contributing meals/items whose values sum to the headline.
- Insufficient-history state explains what is missing.

Reuse for calories/carbs/fats/fiber only when available. Higher is not always better: do not give calories/fat/sugar/sodium misleading “success” colors. Date range, chart and summary update together. Missing days are not zero. Provide accessible text summary, test empty/one-day/long histories.

### I. Progress overview
**Route:** `app/(tabs)/progress.tsx`  
**References:** 460–478, 480, 502; trend detail references above.  
**Priority:** P0/P1.

**Top**
- Header and date range.
- Week/Month/3 months chips only for available data.
- Comparable-period delta cards: weight change, average protein adherence, average calories vs target, workout sessions, PRs.
- Reuse existing sections: strength/body/nutrition/recovery.
- One main selected chart, not every chart above the fold.

**Strength**
- Session consistency heatmap/calendar.
- Sessions, exercise/volume/muscle totals only if correctly computed.
- PR rows with exercise, result, date, prior-best delta when available.
- No cardio load / HR zones without source data.

**Body**
- Latest weight/date.
- Weight trend based on actual weigh-ins.
- InBody comparisons only for fields present in both records.
- CTA to log weight / add InBody results.
- Old body-fat measurement must retain its date; don't infer body fat from weight.

**Nutrition**
- Daily calorie/protein trends and goal adherence.
- Clearly define target hit threshold.
- No log separate from target missed.
- Tap date opens Nutrition on that day.

**Recovery**
- Sleep duration, sleep quality, energy, soreness, stress.
- Separate manually entered signals from imported readings.
- Separate charts for incompatible units; no opaque combined score.

**Empty states**
- One action to add first measurement/log.
- No example chart that can be mistaken for user data.

### J. Workout plan / exercise library
**Route:** `app/(tabs)/workout.tsx`  
**References:** 153–165, 184–203, 211–213; generator 125–152 only if relevant.  
**Priority:** P1.

- Top shows day/plan selector, workout title and start/resume CTA.
- Exercise row shows variant/equipment, target sets×reps and previous performance if known.
- Make supersets/circuits visually distinct and preserve grouping.
- Row actions: edit, replace, history, remove.
- Exercise library: search + muscle/equipment filters only when the schema supports them; selected state obvious; custom move separate.
- Template editor: title, reorder, add/remove move, edit targets. Sticky save, keyboard-safe fields.
- Preserve old sessions when removing custom exercise; don't cascade-delete historical logs.

### K. Active workout session
**References:** 214–219.  
**Priority:** P1, functional risk high.

- Compact header: workout name, elapsed timer, finish/exit.
- Set rows: set number, target/previous result, weight, reps, completion.
- Clear active/completed states; add set; rest timer only if functioning.
- Superset grouping where supported.
- Keep scroll and input focus after saving a set.
- Avoid wearable HR / floating watch controls unless connected hardware exists.
- End action distinct from back navigation; confirm abandoning if state would be lost.
- Log locally with optimistic state. Failed write rolls back cleanly. Avoid duplicate writes from double-tap.
- RPE/effort only if stored by the app.

### L. Workout completion/session detail
**References:** 220–223, 252–263.  
**Priority:** P1.

- Calm completion visual, optional modest haptic.
- Workout name, duration, completed exercises/sets, total volume if valid, PR if detected.
- Effort value only if persisted.
- One primary Done CTA; session details/edit as secondary actions.
- No fabricated strain %, cardio/muscular split or recovery value.
- Detail supports per-exercise set history and safe edits.

### M. Recovery check-in/detail
**Existing surface:** More → recovery; current query `getRecoveryLog`.  
**References:** 274–275, 276–299, 310–312.  
**Priority:** P1.

**Entry fields:** sleep duration, sleep quality, energy, soreness, stress, optional notes. Scale endpoints meaningful, selection obvious, sticky save, keyboard-safe. “Not logged” distinct from low.

**Detail:** selected date, “manual check-in” source label, separate trends for sleep hours, quality, energy, soreness and stress. Correct date range/missing values; one add-check-in action. Keep private/free-text notes out of the AI request unless necessary and user-approved. No composite score unless defined and explained.

### N. Body weight / InBody
**Existing More/body surface and `inbody-paste.tsx`.**  
**References:** metric trend patterns 264–272, 466–475, 486–489.  
**Priority:** P1.

- Latest measured value + exact date/unit.
- Actual weigh-in line chart with range selector.
- InBody record comparisons only on shared fields.
- Separate Log weight / Add InBody actions.
- Paste parser should show review/validation before saving.
- Never imply old measurements are current or infer composition from weight.

### O. AI Coach
**Route:** `app/(tabs)/coach.tsx`  
**References:** 092–108; personalization 109–119 only later.  
**Priority:** P1.

**Opening**
- Compact title/context card using safe real data: today's calories/protein left, workout status, recent trend only if enough history.
- Suggested prompts based on current data:
  - “How much protein do I have left today?”
  - “Summarize my last 7 days.”
  - “What changed in my weight trend?”
  - “Review my last workout.”
  - “Help plan a meal within my remaining targets.”
- Adapt suggestions when data is absent.
- Readable chat bubble width; markdown only where useful.
- Composer above keyboard and bottom safe area.

**States / privacy**
- Honest generating indicator; stop only if cancellation works.
- Distinguish network/auth/rate-limit/config errors; retry without duplicate messages.
- Copy/regenerate/feedback are secondary controls.
- Distinguish estimated suggestions from recorded facts.
- Send an allowlisted context DTO, not the full profile. Do not include injury/supplement/free-text notes by default.
- No fabricated trends, diagnosis or claims beyond known data.
- Memory UI only if memory is actually persisted; show content, purpose and delete control.

### P. More / settings / profile
**Route:** `app/(tabs)/more.tsx`  
**References:** 490–492, 496–499, 504–506, 507–515.  
**Priority:** P1.

Group list:
- Your data: Body & measurements, Recovery check-in, Supplements, Reports.
- Preferences: Profile, Nutrition targets, Units, Appearance, Notifications.
- Account & data: Account, sync status, privacy/export only if implemented.
Rows have one icon style, title, concise subtitle where useful and chevron.

The current More screen uses an active-section state; redesign with that model in mind or migrate one section at a time. Profile/targets need editable forms, validation, local-first persistence and immediate propagation. Appearance only if light/dark/system works throughout. Notification permission status must be honest. Sync last status/retry appears only when configured. Privacy copy must accurately distinguish local DB, AI gateway and optional sync.

### Q. Monthly report / PDF
**Route:** `app/modals/monthly-report.tsx`  
**References:** 460–478, 395–401, 092–108.  
**Priority:** P2 visual polish.

- Opening page explains date range and included domains.
- Generation steps show progress honestly without promising exact time.
- Report: period summary, evidenced wins, nutrition averages/adherence, strength, body composition, recovery history, next-month recommendations.
- Only use scores tied to a clear algorithm; don't invent an overall score.
- Surface missing logs/sparse data.
- PDF should use print-appropriate styling, not simply screenshot the dark UI.
- Retry should not lose gathered data.

## Reusable Bevel patterns to adapt

1. **Data-rich overview card:** one primary number, target/context, one visualization, one concise label.
2. **Metric detail:** main value → target/range → period chips → chart → explanation → contributing entries.
3. **Unified food-entry pipeline:** input modes converge on review → validation → save → refreshed totals.
4. **Bottom sheet:** temporary focused task, quick options, clear close/dismiss.
5. **Consistent chart drilldown:** selected value/date, target, units, no-data and accessible summary.
6. **Explicit logging states:** editable parsed items, quality/source signals, clear commit.
7. **Modular dashboard:** defer card editing until the core hierarchy is stable.
8. **Contextual assistant:** only safe, actually available NutriLift data.

## Do not copy these Bevel features

- Apple Health/Watch permission and integration screens without compatible integration.
- Strain, cardiorespiratory load, physiological recovery, sleep scores, HRV baseline engines or SpO₂/RR/temperature gauges without real data and validated logic.
- CGM/glucose impact pages.
- Subscription paywall.
- Sleep alarm / iOS Shortcuts flows.
- Bevel lifestyle journal and sensitive reproductive/sexual-health tags.
- Wearable source priorities.
- Fake nutrition/food quality score.
- Weather/location widget unless relevant and permissioned.
- Apple Watch multi-device workout handshake.
- Widgets before core UX quality is stable.

## Implementation sequence

### Phase 0 — Audit
1. Create `redesign/bevel-inspired-ui` branch.
2. Capture baseline screenshots on a real device/emulator.
3. Inventory production routes/components, theme tokens, loaded fonts and duplicate/unreferenced UI code.
4. Verify current Home/Nutrition/Workout/Progress/Coach/More and modal behaviors, plus SQLite writes.
5. Write visual regression checklist and tests for touched data paths.

### Phase 1 — Tokens and primitives
1. Sample chosen screenshots and record measured color, insets, radius, typography and icon styles.
2. Create semantic dark-theme tokens.
3. Refactor production Card, ScreenHeader, Button, MacroBar, MacroRing and loading/empty/error primitives.
4. Implement shared action sheet, press states and snackbar.
5. Verify contrast, safe areas, keyboard behavior and small screens.

### Phase 2 — Home as golden screen
1. Rebuild Home against 050/500/047.
2. Preserve current queries/stores/DB writes.
3. Capture screenshot at fixed viewport and compare side-by-side.
4. Fix hierarchy, geometry, typography and spacing before polish.
5. Propagate proven primitives to Nutrition.

### Phase 3 — Nutrition and logging
1. Redesign Nutrition overview using 313–317/395–401.
2. Implement quick-add using 051/240.
3. Align text/voice/barcode/search/confirm flows with 052–091, 120–124 and 061–077.
4. Meal detail/history using 390–394 and 318–324.
5. Test source modes, macro recalculation, quantity, errors, deletion and offline.

### Phase 4 — Progress and metrics
1. Progress overview using 460–478.
2. Nutrition/body trend details using 395–401 and 466–475.
3. Recovery trend views using Bevel detail layout, but label manual sources.
4. Verify range math and local-date boundaries.

### Phase 5 — Workout and Coach
1. Active workout using 214–219.
2. Completion summary using 220–223 with only real calculations.
3. Templates/exercise editor using 153–165 and 184–203.
4. Coach chat using 092–108; personalization only if supported.

### Phase 6 — Settings and reports
1. More/settings based on 490–515.
2. Reports from actual stored report data.
3. Empty/loading/error/offline states.
4. Accessibility, visual comparison and device verification.

## Visual quality checklist for each screen

**Geometry**
- [ ] Similar viewport/aspect ratio for reference and NutriLift
- [ ] Correct safe area and system insets
- [ ] Consistent content alignment, header rhythm and card padding
- [ ] Radius/spacing measured, not guessed
- [ ] CTA doesn't overlap tab bar/gesture bar/keyboard
- [ ] No clipped text/horizontal overflow on small Android

**Hierarchy**
- [ ] One primary focus per screen
- [ ] Number > label > unit context hierarchy
- [ ] Reused typography and semantic color roles
- [ ] Subtle surfaces, restrained borders/shadows
- [ ] Charts with readable labels and selected state
- [ ] Consistent icon family
- [ ] Loading/empty/no-data/error/success/disabled designed

**Behavior**
- [ ] Every visible action works
- [ ] Dates/chips/ranges have obvious selection
- [ ] Modal return preserves needed context
- [ ] Forms retain values after errors
- [ ] Saves persist through current local DB paths
- [ ] Errors recover and retry
- [ ] Accessibility labels/roles/tap targets work

**Data**
- [ ] No demo data shown as real
- [ ] Unknown/missing is not zero
- [ ] Local dates/date ranges correct
- [ ] Macro totals match contributing records
- [ ] Manual recovery not presented as wearable data
- [ ] AI context minimized and redacted
- [ ] Local data remains available offline

## Screenshot comparison protocol

For each screen, identify exact Bevel PNG and state in the catalog; capture NutriLift at the same aspect ratio; compare in order: (1) outer silhouette/safe areas, (2) major blocks, (3) typography and wrapping, (4) spacing/alignment, (5) colors/surfaces, (6) charts/icons, (7) shadows/motion. Make small targeted changes and recapture. Store a manifest mapping NutriLift route to Bevel reference IDs. Do not ship Bevel screenshots as production assets. Don't claim “pixel perfect” until actual side-by-side screenshots have been verified.

## Coding-agent instructions

1. Read the relevant screen and shared components before touching code.
2. Read this blueprint and applicable catalog flow.
3. Locate exact zero-padded Bevel screenshots when archive is available locally.
4. Propose tasks with paths, components, tests and visual checks.
5. Work one screen at a time, no giant all-at-once refactor.
6. Preserve queries, SQLite schema, routes, stores and local-first behavior unless a justified migration is planned.
7. Make Home the golden screen first.
8. Run `npx tsc --noEmit --pretty false`, focused Jest tests and relevant Expo/device diagnostics.
9. Validate on Android device/emulator; web rendering alone isn't native validation.
10. Report modified files, preserved behavior, tests, known gaps and verified comparisons.
11. Never claim pixel perfection without reference captures and comparison.
12. Prefer conservative defaults over broad clarifying questions.

## Sources
- NutriLift: https://github.com/Prithvi-ra-j/NutriLift
- Bevel teardown: https://github.com/ChakshuGautam/bevel-teardown
- Screen catalog: https://github.com/ChakshuGautam/bevel-teardown/blob/main/docs/screen-catalog.md
- User stories: https://github.com/ChakshuGautam/bevel-teardown/blob/main/docs/user-stories.md
