# NutriLift implementation progress tracker

Last updated: 2026-10-15
Base branch: `main`
Base commit: `843cafd469d863d4d12380dda7fdbe9ab02fffda`
Working branch: `implementation/phase-0-baseline`

## Working agreement

- Work in small, independently reviewable changes; do not combine unrelated domains.
- Follow the uploaded Full End-to-End Implementation Blueprint and the repository's master plan.
- No wearable integrations.
- Do not claim tests, builds, or device checks passed without captured results.
- Prefer local deterministic checks before quota-limited Expo EAS builds.
- Keep canonical domain writes out of UI components; keep AI from becoming the source of truth.
- Review and reconcile existing PRs before reimplementing overlapping work.

## Current status

| Phase | Status | Evidence / notes |
|---|---|---|
| 0. Baseline and defect register | In progress | Tracker committed; overlapping PRs #1/#3/#4/#7 compared at metadata/diff level. No PR merged. |
| 1. CI/build reproducibility | Complete | Validation run [#38618276698](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38618276698) succeeded on tracker/assets commit `390b31be`: locked dependency install, TypeScript, Jest, Expo local-asset validation, and public Expo config all passed. Earlier failed asset check is resolved. |
| 2. Domain/persistence foundations | Complete (automated; device smoke pending) | Runtime migrations validate required tables/columns, track SQLite `user_version`, reject future-version databases before DDL, and show recoverable initialization/workout errors. In-memory SQLite tests cover clean install, legacy upgrade/data preservation, idempotence, future-version rejection, and Drizzle SQL snapshot parity. Validation run [#38683981092](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38683981092) passed on `12ce59a`; physical-device fresh-install/upgrade smoke testing remains unverified. |
| 3. Calendar dates/time zones | Complete (automated; device smoke pending) | Added `lib/utils/local-date.ts` for local date keys, strict date-only parsing, calendar-day arithmetic, DST-safe calendar-day differences, and explicit Monday–Sunday UI weeks versus Sunday–Saturday weekly-summary records. Migrated DateNavigator, dashboard/Nutrition/Workout/Progress/More screens and date-only display parsing; food/InBody entry flows; Today store; body/workout/recovery/nutrition queries; report ranges; weekly Coach context; monthly/quarterly summaries; logger filenames; progress exports; Life OS date-only fallback mapping; and demo-seed date generation. Fixed Sunday selected-week handling and body-goal projection date arithmetic. Latest CI run [#38686272529](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38686272529) passed on `a4d12bd71b5bf11a8091cdbb3884674a09b590c6`: TypeScript, Jest, and Expo config/assets all succeeded (38 suites / 284 tests). Regression tests cover invalid keys, month/year boundaries, IST/UTC/negative-offset local-day conversion, DST transitions, and both week conventions. Audit confirms remaining UTC use in the Supabase Edge Function is intentional for server-side quota accounting and ISO timestamps representing instants remain UTC. Physical-device smoke testing remains unverified. Developer-only delete-workout scripts were also migrated to local date keys in commits f3cde09 and cbe5df8; validation is tracked with the current branch CI. |
| 4. Nutrition pipeline | In progress | Local catalogue (21 foods), deterministic parser, local-first/AI fallback, shared food-log validation, batch writes, and typed/voice save-path integration are implemented. Latest nutrition changes are undergoing CI; barcode confirmation uses the same validated repository write path. Device-level entry testing and final CI evidence remain pending. |
| 5. Profile/targets | Not started | Effective-dated history; existing PR #7 must be reviewed first. |
| 6. Workout/recovery | In progress | First slice adds persisted session lifecycle status (schema v4), guarded/idempotent set writes, finish/cancel controls, and manual recovery validation. Automated CI for the latest changes is pending; session lifecycle UI/device checks and end-to-end workout/recovery persistence tests remain. |
| 7. Coach/recommendations | Not started | Restrict context to approved fields; use validated evidence. |
| 8. Offline sync / Life OS | Not started | Existing integration under `lib/integrations/life-os/`; do not replace without a migration plan. |
| 9. UI/design system | Not started | Existing overlapping PRs #5 and #6; defer broad redesign until correctness foundations are stable. |
| 10. Regression/release | Not started | Need reproducible local checks and an installable artifact; cloud build currently blocked by EAS quota. |

## Baseline findings (verified)

1. `main` commit: `843cafd469d863d4d12380dda7fdbe9ab02fffda`.
2. Seven open pull requests exist (#1–#7). They include build stabilization, broad P0 repair, release hardening, UI foundation/polish, and target changes; review for overlapping work before merging/reimplementing.
3. The workflow `.github/workflows/build-apk.yml` runs on every push to `main`, installs dependencies, and then starts an EAS Android preview build without a prior typecheck/unit-test gate.
4. Latest sampled EAS job (run [38163207596](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38163207596), commit `843cafd`) successfully checked out, installed Node/dependencies and uploaded the project. EAS then failed because the account had used its free-plan Android build allowance for the month. This is a quota failure, not proof of source compilation failure.
5. CI logs also show the current workflow uses Node 20 while resolved `@supabase/supabase-js@2.116.0` declares Node >=22. Validate a compatible reproducible runtime before finalizing workflow changes.
6. `package.json` has `test`, but no dedicated `typecheck` or `expo:config-check` script.
7. `tsconfig.json` enables strict TypeScript settings.
8. README says assets live in `assets/`, while recursive Git tree inspection of `main` returned no tracked paths under `assets/`; validate config paths and branch history before changing/creating assets (the broad `.gitignore` ignores common image extensions).
9. Only one GitHub Actions workflow is present: `.github/workflows/build-apk.yml`.

## Progress log

### 2026-10-15 — Phase 2, unit 1: runtime schema parity
- [x] Confirmed `custom_exercises` exists in Drizzle schema and generated SQL but was missing from `runMigrations()` runtime SQL.
- [x] Add idempotent `CREATE TABLE IF NOT EXISTS custom_exercises` to runtime initialization, matching schema columns and unique exercise name.
- [x] Add a post-migration SQLite catalog assertion for core tables so incomplete initialization fails with an actionable error.
- [x] Add unit tests for complete schema, missing custom-exercise table, and empty database cases.
- [x] CI passed for first unit in run [#38679440691](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38679440691) (commit `e999f9d`).
- [x] Extend post-migration validation to required additive columns (`duration_sec`, `distance_km`, `exercise_type`, and update fields), not just table names.
- [x] Make Workout loading failure recoverable with an explicit error and retry action.
- [x] Add `PRAGMA user_version` schema tracking; schema version advances only after table/column assertions pass and future-version databases fail closed.
- [x] Stop rendering database-dependent screens when root initialization fails; show the error and offer retry.
- [x] CI passed for additive-migration refactor commit `3fce6ef` in run [#38681135821](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38681135821): dependency install, TypeScript, Jest, and Expo config/assets passed.
- [x] Add real in-memory SQLite integration tests for empty install, upgrade from a legacy schema while preserving a saved food log, repeat migration, and rejecting a future schema version (`runtime-migrations.test.ts`).
- [ ] Re-run CI after restoring the pre-DDL future-version guard and aligning sync-tombstone column assertions.
- [x] Reconcile the clean-install Drizzle SQL snapshot with runtime schema additions (`updated_at` columns and sync tables) and add a parity regression test. Runtime `runMigrations()` remains the production upgrade path for existing installs.
- [x] Ensure `sync_tombstones` exists before additive-column checks, so older installations receive the `external_id` upgrade; include it in migration-contract assertions.

### 2026-10-15 — Phase 4, unit 1: local-first nutrition pipeline and save-path validation
- [x] Expand the deterministic Indian-food starter catalogue and normalize per-100g nutrition values with serving metadata.
- [x] Add local meal parsing for quantity-aware food aliases, meal cues, unresolved segments, and confidence notes; add direct parser tests.
- [x] Route common fully-resolved meals through the local parser before any AI request; use AI only for unresolved input and preserve local results if AI is unavailable.
- [x] Fix serving conversion so counted foods prefer a medium serving and explicit cup/bowl/scoop units use matching catalogue serving weights; add conversion regression tests.
- [x] Replace the unsafe parse-error placeholder that could be saved with zero calories; failed parsing now preserves the text and blocks saving until nutrition can be estimated.
- [x] Add a shared insertFoodLogs persistence path that validates all items and batches multi-item inserts in one SQLite transaction, then recomputes affected daily totals once per date.
- [x] Wire the food-log screen to the shared batch save path and change the action label to “Parse Meal” to reflect local-first + AI fallback behavior.
- [ ] Verify the newest CI run is green; add direct tests for save validation/transaction behavior and confirm the local parser is exercised from production app/modals/log-food.tsx.
- Current implementation is on implementation/phase-0-baseline; no wearable integrations or main changes.
### 2026-10-15 — Phase 3, unit 1: canonical local-calendar date foundations
- [x] Add `lib/utils/local-date.ts` with local date-key formatting, strict parsing, calendar-day arithmetic, DST-safe calendar differences, and explicit Monday-start and Sunday-start week helpers.
- [x] Add tests for invalid dates, month/year boundaries, local midnight in IST/UTC/negative-offset zones, DST transitions, and both week conventions.
- [x] Migrate app date entry, navigation, labels, history displays, analytics queries, summary boundaries, report ranges, weekly Coach context, logger date labels, export windows, Life OS date-only fallback, and demo seed generation.
- [x] Fix Sunday selection in Workout's completed-week lookup by using the canonical Monday-start week helper.
- [x] Preserve UTC for true timestamps and server-side AI usage quota windows; those represent instants/server accounting rather than user-local calendar labels.
- [x] CI passed on commit `664d512` in run [#38685724797](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38685724797): TypeScript, 38 Jest suites / 284 tests, and Expo config/assets.
- [x] Audit remaining production date-only parsing; preserve UTC only for true timestamps and server-side quota accounting. Latest CI passed on `a4d12bd71b5bf11a8091cdbb3884674a09b590c6` in [run #38686272529](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38686272529): TypeScript, Jest (38 suites / 284 tests), and Expo config/assets all passed. Phase 3 exit criteria satisfied for automated checks; physical-device smoke remains unverified. Developer-only delete-workout scripts still need local-date cleanup.

### 2026-10-15 — Phase 2, unit 2: migration assertions and recoverable failure states
- [x] Validate required additive columns after migrations, not just table presence (`fbdaedc`).
- [x] Replace the Workout screen’s indefinite loading failure with a visible error and retry (`fbdaedc`).
- [x] Add SQLite `user_version` tracking and reject future schema versions (`9f976b3`, formatting follow-up `e7afd7a`).
- [x] Make root initialization failure visible and block database-dependent screens until retry succeeds (`74e05d1`).
- [x] Add SQLite-backed tests for clean install, legacy upgrade/data preservation, idempotent rerun and future-version rejection (`runtime-migrations.test.ts`).
- [x] Fix failures found in the first integration run; latest validation passed 37 suites / 271 tests in [run #38683792913](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38683792913).
- [x] Align the Drizzle schema’s sync tombstone uniqueness with runtime SQL and add clean-install SQL execution coverage.
- [ ] Re-run CI after schema/migration parity tests; then confirm Phase 2 exit criteria.

### 2026-10-15 — Phase 1 validation follow-up
- [x] Inspect the failed validation run and job logs rather than inferring the cause from the red status.
- [x] Confirm TypeScript and Jest passed on the tested head; failure is isolated to the missing Expo assets.
- [x] Verify the configured assets are absent from the tracked baseline tree and the working branch; no native image assets are available to reuse.
- [x] Add required PNG assets and verify all configured asset paths in CI.
- [x] Complete the validation workflow with a green terminal result; Phase 1 exit criteria satisfied.

### 2026-10-14 — Baseline inspection
- [x] Confirm repository access and default branch.
- [x] Create `implementation/phase-0-baseline` from `main`.
- [x] Enumerate branches and open PRs.
- [x] Inspect package scripts, workflow, Expo/EAS config, TypeScript config and README.
- [x] Inspect recent failed EAS job logs and classify quota failure correctly.
- [x] Inspect PR #1 Android build diff; PR #3 core P0 diff; PR #4 production hardening/quality workflow; PR #7 adaptive targets/date helpers. Reuse only after CI evidence; these are overlapping drafts with no validation evidence visible in their descriptions.
- [x] Add reproducible cheap CI checks before any cloud build (workflow in PR #8; CI pending).
- [x] Validate `npm ci --legacy-peer-deps` on Node 22 (passed in run #38611739263 and later runs).
- [x] Compared PR #4 quality gate and noted overlapping workflow. Keep this small validation-only PR isolated for now; reconcile before merging.
- [x] Confirm strict TypeScript passed on commit `74a2b4c` after adding `PressableScale`.
- [x] Jest passed on commit `68c488f`: 35 suites and 261 tests passed. Note: master-plan audit says only a small subset covers production `app/` imports; passing the broad `src/` test corpus is not equivalent to full app journey coverage.
- [x] Inspect `app.json`, `.gitignore`, the tracked Git tree, and the master plan: all four configured image assets are genuinely absent; no existing image assets can be safely reused.
- [x] Add four valid PNG assets at the paths configured in `app.json` (commit `8d211db`; shared dark background and lime NutriLift mark).
- [x] Validation passed on commit `390b31be` in run [#38618276698](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38618276698): dependency installation, TypeScript, Jest, local asset checks, and `expo config --type public` all succeeded.

## Update protocol

After every small implementation unit, update this file with the commit/PR, files touched, tests run, observed results, unresolved risks, and next step. A phase is complete only when its explicit exit criteria have evidence.


### 2026-10-15 — Phase 4 implementation started
- [x] Expand the local food catalogue from one entry to 21 entries, including common Indian staples, breakfast foods, and protein sources; normalize nutrition per 100 g and label household estimates honestly (commits `1ebf9a3`, `5d307b3`).
- [x] Add deterministic local parsing for food aliases, amounts, meal cues, confidence, and unresolved segments (`6b57b18`; quantity-regex follow-ups `8e9cc3c`, `6d2896d`, `7de6276`).
- [x] Add regression tests for common meals, aliases, meal cues, unresolved inputs, and catalogue integrity (`80e7958`).
- [x] Integrate local-first parsing in `parseFoodInput`; call the LLM only when the local parser cannot resolve the full input, and retain local matches if AI fallback fails (`ea2758b`).
- [ ] Run TypeScript, Jest, and Expo validation on the latest branch head; fix any failures before exit review.
- [x] Add a shared nutrition-log validation contract for real calendar dates, allowed meal/source values, finite non-negative macros, positive calories and positive quantities; add focused validation tests (commits `5cd0d2a`, `9ce386c`, `3a571e9`, `1a873f2`).\n- [x] Add atomic batch insert for multi-item meals and use it for typed/pasted and voice logs; map typed mode to `manual` and store voice timestamps in Unix seconds (commits `c155da7`, `c9f41dc`, `20d39a4`).\n- [ ] Review barcode/manual entry paths for consistent validation and run CI before exit review.
- [ ] Confirm acceptance criteria and update tracker only with captured CI evidence.

- [x] Add `lib/utils/local-date.ts` with local date-key formatting, strict parsing, calendar-day arithmetic, DST-safe calendar differences, and explicit Monday-start and Sunday-start week helpers.
- [x] Add tests for invalid dates, month/year boundaries, local midnight in IST/UTC/negative-offset zones, DST transitions, and both week conventions.
- [x] Migrate app date entry, navigation, labels, history displays, analytics queries, summary boundaries, report ranges, weekly Coach context, logger date labels, export windows, Life OS date-only fallback, and demo seed generation.
- [x] Fix Sunday selection in Workout's completed-week lookup by using the canonical Monday-start week helper.
- [x] Preserve UTC for true timestamps and server-side AI usage quota windows; those represent instants/server accounting rather than user-local calendar labels.
- [x] CI passed on commit `664d512` in run [#38685724797](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38685724797): TypeScript, 38 Jest suites / 284 tests, and Expo config/assets.
- [x] Audit remaining production date-only parsing; preserve UTC only for true timestamps and server-side quota accounting. Latest CI passed on `a4d12bd71b5bf11a8091cdbb3884674a09b590c6` in [run #38686272529](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38686272529): TypeScript, Jest (38 suites / 284 tests), and Expo config/assets all passed. Phase 3 exit criteria satisfied for automated checks; physical-device smoke remains unverified. Developer-only delete-workout scripts still need local-date cleanup.

### 2026-10-15 — Phase 2, unit 2: migration assertions and recoverable failure states
- [x] Validate required additive columns after migrations, not just table presence (`fbdaedc`).
- [x] Replace the Workout screen’s indefinite loading failure with a visible error and retry (`fbdaedc`).
- [x] Add SQLite `user_version` tracking and reject future schema versions (`9f976b3`, formatting follow-up `e7afd7a`).
- [x] Make root initialization failure visible and block database-dependent screens until retry succeeds (`74e05d1`).
- [x] Add SQLite-backed tests for clean install, legacy upgrade/data preservation, idempotent rerun and future-version rejection (`runtime-migrations.test.ts`).
- [x] Fix failures found in the first integration run; latest validation passed 37 suites / 271 tests in [run #38683792913](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38683792913).
- [x] Align the Drizzle schema’s sync tombstone uniqueness with runtime SQL and add clean-install SQL execution coverage.
- [ ] Re-run CI after schema/migration parity tests; then confirm Phase 2 exit criteria.

### 2026-10-15 — Phase 1 validation follow-up
- [x] Inspect the failed validation run and job logs rather than inferring the cause from the red status.
- [x] Confirm TypeScript and Jest passed on the tested head; failure is isolated to the missing Expo assets.
- [x] Verify the configured assets are absent from the tracked baseline tree and the working branch; no native image assets are available to reuse.
- [x] Add required PNG assets and verify all configured asset paths in CI.
- [x] Complete the validation workflow with a green terminal result; Phase 1 exit criteria satisfied.

### 2026-10-14 — Baseline inspection
- [x] Confirm repository access and default branch.
- [x] Create `implementation/phase-0-baseline` from `main`.
- [x] Enumerate branches and open PRs.
- [x] Inspect package scripts, workflow, Expo/EAS config, TypeScript config and README.
- [x] Inspect recent failed EAS job logs and classify quota failure correctly.
- [x] Inspect PR #1 Android build diff; PR #3 core P0 diff; PR #4 production hardening/quality workflow; PR #7 adaptive targets/date helpers. Reuse only after CI evidence; these are overlapping drafts with no validation evidence visible in their descriptions.
- [x] Add reproducible cheap CI checks before any cloud build (workflow in PR #8; CI pending).
- [x] Validate `npm ci --legacy-peer-deps` on Node 22 (passed in run #38611739263 and later runs).
- [x] Compared PR #4 quality gate and noted overlapping workflow. Keep this small validation-only PR isolated for now; reconcile before merging.
- [x] Confirm strict TypeScript passed on commit `74a2b4c` after adding `PressableScale`.
- [x] Jest passed on commit `68c488f`: 35 suites and 261 tests passed. Note: master-plan audit says only a small subset covers production `app/` imports; passing the broad `src/` test corpus is not equivalent to full app journey coverage.
- [x] Inspect `app.json`, `.gitignore`, the tracked Git tree, and the master plan: all four configured image assets are genuinely absent; no existing image assets can be safely reused.
- [x] Add four valid PNG assets at the paths configured in `app.json` (commit `8d211db`; shared dark background and lime NutriLift mark).
- [x] Validation passed on commit `390b31be` in run [#38618276698](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38618276698): dependency installation, TypeScript, Jest, local asset checks, and `expo config --type public` all succeeded.

## Update protocol

After every small implementation unit, update this file with the commit/PR, files touched, tests run, observed results, unresolved risks, and next step. A phase is complete only when its explicit exit criteria have evidence.


### 2026-10-15 — Phase 4 implementation started
- [x] Expand the local food catalogue from one entry to 21 entries, including common Indian staples, breakfast foods, and protein sources; normalize nutrition per 100 g and label household estimates honestly (commits `1ebf9a3`, `5d307b3`).
- [x] Add deterministic local parsing for food aliases, amounts, meal cues, confidence, and unresolved segments (`6b57b18`; quantity-regex follow-ups `8e9cc3c`, `6d2896d`, `7de6276`).
- [x] Add regression tests for common meals, aliases, meal cues, unresolved inputs, and catalogue integrity (`80e7958`).
- [x] Integrate local-first parsing in `parseFoodInput`; call the LLM only when the local parser cannot resolve the full input, and retain local matches if AI fallback fails (`ea2758b`).
- [ ] Run TypeScript, Jest, and Expo validation on the latest branch head; fix any failures before extending the save path.
- [ ] Complete atomic/validated nutrition writes and review voice/barcode/manual entry paths for consistent validation, date/meal/source semantics, and no silent zero-calorie saves.
- [ ] Confirm acceptance criteria and update tracker only with captured CI evidence.


### 2026-10-15 — Phase 4, unit 2: validated nutrition persistence
- [x] Add shared food-log validation for real local calendar dates, meal/source values, names, finite non-negative macros, positive calories, and positive quantities (`0f11be2`).
- [x] Route typed/pasted and voice meals through batch insertion instead of inserting each item separately; voice timestamps now use Unix seconds.
- [x] Make batch food rows and daily nutrition aggregate updates part of one Drizzle transaction (`ab7639b`).
- [x] Add validation regression cases for zero nutrition, negative/non-finite values, invalid dates/meals, missing names, and invalid quantities (`3715fd8`).
- [ ] Confirm latest CI run [#38688938088](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38688938088) is green; fix any failures before marking this unit complete.
- [ ] Finish barcode/manual confirmation-path review and confirm that all food-entry modes surface validation failures without silently saving zero-calorie estimates.


### 2026-10-15 — Phase 6, unit 1: workout lifecycle and recovery validation
- [x] Add a persisted workout session status (planned, in_progress, completed, cancelled) and increment local SQLite schema version to 4.
- [x] Migrate older sessions using existing timestamps: ended sessions become completed; sessions with a start timestamp become in progress; otherwise planned.
- [x] Add explicit forward-only lifecycle transitions and finish/cancel controls; cancellation retains logged sets.
- [x] Validate workout set metrics before persistence, make repeated set IDs idempotent, and block mutation of completed/cancelled sessions in the query layer.
- [x] Add manual recovery input validation and tests; wearable integrations remain out of scope.
- [ ] Verify latest TypeScript/Jest/Expo CI and fix all failures.
- [ ] Add end-to-end persistence coverage for session transitions and closed-session guards; device smoke remains unverified.
