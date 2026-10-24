# NutriLift — Full Implementation Master Plan

> Source of truth for implementation work against `Prithvi-ra-j/NutriLift`.
> Baseline: `main` as inspected on 2026-09-22.
> Scope: mobile-first Expo/React Native nutrition + workout app; fix correctness, data integrity, performance, AI safety/cost, UX, test coverage, and release/update reliability.

## Baseline Status

The repository currently contains:
- Expo Router application under `app/`
- Runtime libraries under `lib/`
- UI components under `components/`
- A large standalone/reference library under `src/`
- Local SQLite/Drizzle migrations under `drizzle/`
- Supabase migrations and Edge Function under `supabase/`
- Expo/Android configuration in `app.json`, `app.config.js`, `android/`
- Jest configuration with a large test corpus

Important architectural rule: code in `src/` is not considered production app coverage unless imported by the actual application. Tests of unused reference/library code must not be counted as evidence that app behavior is tested.

## Priority Model

### P0 — Release blockers / correctness
Anything that can make a fresh install fail, corrupt dates, break core logging, expose unnecessary data, or prevent reliable shipping.

### P1 — Core product quality
Performance, usable data entry, reliable AI flows, editable settings, proper offline/local behavior, and meaningful tests.

### P2 — Polish and capability
Animations, richer food catalog, charts/visualization, haptics, navigation refinement, accessibility and refined UX.

### P3 — Expansion
Advanced personalization, richer integrations, deeper analytics, and non-critical platform enhancements.

---

# P0 — Core Reliability

## P0.1 Fix local database migrations

### Problem
`runMigrations()` does not create `custom_exercises`, while Workout queries it without robust error handling.

### Required changes
- Add `custom_exercises` to the authoritative local schema/migration path.
- Ensure `runMigrations()` executes the table creation for fresh installs.
- Add migration/version assertions so every expected table exists after initialization.
- Make Workout loading fail closed with a visible recoverable error rather than an infinite spinner.
- Add a clean-install migration test that creates an empty DB and asserts every required table.

### Acceptance criteria
- Fresh database initializes without missing-table errors.
- Workout tab loads on a fresh install.
- Existing installs migrate forward without data loss.
- A missing table never causes an infinite loading state.

## P0.2 Fix date handling globally

### Problem
UTC-date usage appears in 58 places across 29 files. This can shift user-local dates, especially around midnight.

### Required changes
- Introduce one canonical local-calendar date utility.
- Replace ad-hoc `toISOString().slice(0,10)` / UTC-derived day keys where calendar-local dates are intended.
- Keep timestamps in UTC where they represent instants; convert to local date only at calendar boundaries.
- Centralize week/day calculations and test them in IST, UTC and a negative-offset zone.
- Audit streaks, meals, workouts, daily summaries, weekly summaries and historical views.

### Acceptance criteria
- A log near midnight remains on the user’s local calendar day.
- Week boundaries are correct across time zones.
- No production app code constructs day keys from UTC unless explicitly intended.

## P0.3 Fix Sunday completed-day calculation

### Problem
The completed-day-type range calculation returns an empty range on Sundays.

### Required changes
- Define the week range using explicit start/end semantics.
- Add Sunday, Monday, timezone-boundary and empty-data tests.
- Ensure the UI and stats engine agree on the same week definition.

### Acceptance criteria
- Sunday always evaluates the current week correctly.
- Weekly completion does not disappear on Sundays.

## P0.4 Secure and minimize Coach context

### Problem
Coach sends the whole profile to the LLM, including injury notes and supplements, on every request.

### Required changes
- Create an explicit AI context DTO with only fields required for the requested task.
- Default to minimum necessary context.
- Exclude sensitive/free-text fields unless the specific feature requires them.
- Add a redaction/allowlist test.
- Document data passed to the AI gateway.

### Acceptance criteria
- Coach requests contain only approved fields.
- Injury/supplement notes are not sent unless explicitly required by a supported workflow.
- No raw profile object is serialized into the model request.

## P0.5 Verify AI gateway accounting and auth

### Current behavior
The Edge Function requires authentication and caps requests at 100/day.

### Required changes
- Confirm failed upstream Groq calls are not incorrectly counted as successful usage.
- Make daily-limit semantics explicit in user-local or UTC terms.
- Validate request payloads with a strict schema.
- Reject unexpected fields and unsafe token values.
- Return user-friendly error categories for auth, rate limit, validation and upstream failure.

### Acceptance criteria
- Usage is counted according to the documented policy.
- Gateway cannot receive arbitrary models.
- AI UI clearly distinguishes auth/rate-limit/network errors.

## P0.6 Authentication path completeness

### Problem
AI requires sign-in, but the app has sign-in with no sign-up flow.

### Required changes
- Decide and document auth model for this personal app.
- If sign-in is required, provide a usable account creation path or an explicit first-run setup path.
- Provide session persistence and sign-out.
- Handle unauthenticated AI actions without dead-end UI.

### Acceptance criteria
- A new user can understand how to obtain a valid session.
- AI failure never traps the user in a broken flow.

## P0.7 Fix missing referenced assets

### Problem
`app.json` references `assets/` files, but the committed repository does not contain the referenced assets.

### Required changes
- Restore/create the required icon, adaptive icon, splash and favicon assets.
- Verify all asset paths in Expo config.
- Add a CI validation step for referenced local assets.

### Acceptance criteria
- Expo config resolves every referenced local asset.
- Android/web build does not fail due to missing assets.

## P0.8 OTA/runtime compatibility

### Problem
`runtimeVersion` is fixed at `1.0.0`. Native-module changes can make an OTA update incompatible with an existing binary.

### Required changes
- Define a runtime-version strategy tied to native dependency changes.
- Bump runtime version when native modules/config require a new binary.
- Document which changes are OTA-safe vs binary-required.
- Add release checklist validation.

### Acceptance criteria
- Every production OTA has a compatible native runtime.
- Native dependency changes cannot silently ship under an incompatible runtime version.

---

# P1 — Core Product Quality

## P1.1 Optimize workout set logging

### Problem
After each logged set, the workout screen reloads the whole session and runs one query per exercise.

### Required changes
- Update local session state optimistically after a successful set write.
- Batch/prefetch exercise data instead of one query per exercise.
- Avoid full-session reloads after every set.
- Recompute only affected aggregates.
- Preserve UI position and input focus.

### Acceptance criteria
- Logging a set does not visibly reload the entire workout.
- Query count is bounded by session load, not set count.
- Failed writes roll back optimistic state cleanly.

## P1.2 Food database baseline

### Problem
`indianFoodDB.ts` contains one food despite advertising 20.

### Required changes
- Replace header claims with actual counts.
- Add a useful Indian-food starter catalogue covering common staples and protein sources.
- Store nutrition values in one normalized format.
- Add aliases for common wording.
- Keep catalogue data local and deterministic.

### Acceptance criteria
- Search finds common Indian foods without AI.
- Seed count and documentation match.
- Nutrition values are test-covered.

## P1.3 Local food parser before LLM

### Goal
Use deterministic parsing for simple meal text before spending AI quota.

### Required changes
- Integrate the verified parser into meal logging.
- Parse examples such as `2 eggs, dal, 1 roti`.
- Preserve meal cues such as breakfast/lunch/dinner.
- Return confidence and unresolved items.
- Fall back to AI only when necessary.

### Acceptance criteria
- Common meal text is parsed locally.
- `for breakfast` is not stripped before meal classification.
- AI usage is reduced for deterministic cases.

## P1.4 Barcode/cache cleanup

### Problem
Cache cleanup removes rows where `last_used == cutoff` rather than only rows older than cutoff.

### Required changes
- Correct the cutoff comparison.
- Add boundary tests for equal, older and newer timestamps.
- Make cleanup idempotent.

### Acceptance criteria
- Boundary row at cutoff is retained.
- Older rows are removed.
- Newer rows remain.

## P1.5 Settings editability

### Problem
Settings is read-only for profile and targets.

### Required changes
- Add editable profile fields relevant to nutrition planning.
- Add editable calorie/macro targets.
- Validate ranges and units.
- Persist locally first.
- Sync when authenticated.
- Add reset/cancel semantics.

### Acceptance criteria
- User can edit profile/targets without leaving Settings.
- Invalid values cannot corrupt calculations.
- Changes are reflected across Home/Meals/Coach.

## P1.6 Test actual production app code

### Problem
All 35 suites / 261 tests pass, but only 2 suites cover application code; most cover the unused `src/` library.

### Required changes
- Inventory tests by imported production path.
- Add tests around:
  - DB initialization/migrations
  - date helpers
  - meal parser
  - nutrition calculations
  - workout set logging
  - streak/week logic
  - AI request shaping/redaction
  - cache cleanup
  - Settings persistence
- Keep reference-library tests, but do not count them in production coverage.

### Acceptance criteria
- CI reports production app test coverage separately.
- Core P0/P1 paths each have direct tests.
- TypeScript and Jest remain green.

## P1.7 Error-state architecture

### Required changes
- Replace raw `Alert.alert` usage where inline recovery is more appropriate.
- Establish consistent error taxonomy:
  - validation
  - database
  - network
  - auth
  - AI/rate limit
- Add loading/empty/error/success states to core screens.
- Keep actionable retry behavior near the failure.

### Acceptance criteria
- Core screens never spin forever without explanation.
- Errors are recoverable where possible.
- User-facing messages are consistent.

## P1.8 Pressable consistency

### Current baseline
There are 65 real `TouchableOpacity` usages.

### Required changes
- Standardize on a shared pressable primitive.
- Preserve accessibility role/label/hitSlop.
- Add consistent pressed-state feedback.
- Use haptics only where it improves confirmation/interaction, not every tap.

### Acceptance criteria
- New UI uses shared pressable primitives.
- Legacy touchables are migrated where practical.
- No loss of accessibility semantics.

---

# P2 — UI/UX + Performance Polish

## P2.1 Mobile-first design system

### Required changes
- Centralize spacing, typography, radii, surfaces and semantic colors.
- Build reusable `AppText`, buttons, cards, inputs, chips and sheets.
- Use Samsung A52-class viewport constraints as a practical lower reference.
- Avoid desktop-first responsive assumptions.

## P2.2 Motion system

### Current baseline
Reanimated, Skia and Victory are installed but not used by application code; current skeleton loading uses React Native `Animated`.

### Required changes
- Use Reanimated for interactions that benefit from native-driven motion.
- Use Skia only for high-value visualization (e.g. progress ring) rather than decorative complexity.
- Use a consistent motion timing/easing system.
- Avoid animation on every component.

## P2.3 Navigation / floating Log interaction

### Required changes
- Refine bottom navigation around a prominent central Log action.
- Keep tab navigation stable while opening the logging surface.
- Add drag-to-dismiss behavior only where it improves flow.
- Verify safe-area handling on Android.

## P2.4 Keyboard and form ergonomics

### Required changes
- Ensure forms avoid keyboard overlap.
- Persist draft values during accidental keyboard dismissal/navigation.
- Validate on blur and submit appropriately.
- Keep primary actions visible.

## P2.5 Accessibility

### Required changes
- Audit labels, roles, focus order, contrast, dynamic text and touch targets.
- Ensure icon-only controls have accessible labels.
- Do not use color as the only state indicator.

## P2.6 Charts and analytics

### Required changes
- Introduce Victory only for meaningful trends.
- Prefer simple summaries where a chart adds little value.
- Keep charts performant on mobile.
- Test empty, one-point and long-history datasets.

---

# P3 — Expansion

## P3.1 Richer food intelligence
- Expand local catalogue.
- Add synonyms and regional variants.
- Improve deterministic portion parsing.
- Add explainable AI fallback.

## P3.2 Personalized coaching
- Context-aware macro suggestions.
- Protein-gap suggestions.
- Streak and adherence insights.
- Clearly separate calculations from LLM prose.

## P3.3 Sync robustness
- Build on current Supabase sync tables.
- Add conflict strategy, cursoring, retry/backoff and tombstones.
- Keep local-first UX.
- Surface last-sync health in Settings.

## P3.4 Export and portability
- JSON/CSV export.
- Human-readable report.
- Restore/import flow.
- Validate schema versions.

---

# Cross-Cutting Engineering Standards

## Data rules
- Local SQLite is the fast source for UI interactions.
- Remote sync is eventual and resilient.
- Timestamps represent instants; date keys represent user-local calendar dates.
- All migrations are append-only and versioned.

## AI rules
- AI is a fallback/orchestration layer, not the source of truth for numeric nutrition calculations.
- Context is explicit and allowlisted.
- Gateway validates model, message structure and quotas.
- Every AI feature documents whether it consumes quota.

## Performance rules
- No N+1 queries on interactive paths.
- No full-screen reload after every atomic action.
- Prefer optimistic local updates with rollback.
- Avoid unnecessary rerenders and expensive derived calculations.

## Testing rules
- Test production app imports, not just unused reference utilities.
- Unit-test domain logic.
- Integration-test DB repositories and migration initialization.
- Add targeted UI tests for user-critical flows.
- Add regression tests for every P0 bug.

## Release rules
- Validate Expo config and referenced assets.
- Validate native runtime compatibility for OTA.
- Run TypeScript check.
- Run production test suite.
- Verify clean-install DB path.
- Verify Android release build.
- Smoke-test: onboarding/auth, Home, Meal Log, Workout, Coach, Settings.

---

# Suggested Execution Order

1. P0.1 database migration
2. P0.2 date normalization
3. P0.3 Sunday week bug
4. P0.4 AI context redaction
5. P0.5 gateway validation/accounting
6. P0.6 auth completeness
7. P0.7 missing assets
8. P0.8 runtime/OTA strategy
9. P1.1 workout performance
10. P1.3 local food parser integration
11. P1.4 cache cleanup
12. P1.5 Settings editing
13. P1.6 real production test coverage
14. P1.7 error-state cleanup
15. P1.8 touchable standardization
16. P2 design/motion/accessibility
17. P2 charts
18. P3 expansion work

---

# Definition of Done

NutriLift is considered implementation-complete only when:

- Fresh install initializes local DB successfully.
- Core logs work across local-midnight and Sunday boundaries.
- Meal logging handles common Indian foods locally before AI fallback.
- Workout set logging is responsive without repeated full-session reloads.
- AI requests are authenticated, quota-aware, validated, and minimally scoped.
- Settings can edit and persist the supported profile/target fields.
- Production code has direct regression tests for P0/P1 behavior.
- Core screens have explicit loading, empty, error and retry states.
- Expo assets/config resolve cleanly.
- OTA updates follow a documented runtime compatibility strategy.
- Android release build and clean-install smoke test pass.
- UI is intentionally mobile-first and consistent across core flows.

## Current implementation estimate

Based on the committed baseline plus verified findings:
- Architecture/reference work: substantial
- Production integration: incomplete
- P0: not complete
- P1: partially implemented
- P2: partially implemented / mostly infrastructure present
- P3: largely future scope

Do not convert this into a single percentage until each acceptance criterion is measured. A milestone percentage should be based on completed acceptance criteria, not file count or test count.
