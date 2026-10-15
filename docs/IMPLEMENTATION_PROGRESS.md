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
| 3. Calendar dates/time zones | Complete (automated; device smoke pending) | Added `lib/utils/local-date.ts` for local date keys, strict date-only parsing, calendar-day arithmetic, DST-safe calendar-day differences, and explicit Monday–Sunday UI weeks versus Sunday–Saturday weekly-summary records. Migrated DateNavigator, dashboard/Nutrition/Workout/Progress/More screens and date-only display parsing; food/InBody entry flows; Today store; body/workout/recovery/nutrition queries; report ranges; weekly Coach context; monthly/quarterly summaries; logger filenames; progress exports; Life OS date-only fallback mapping; and demo-seed date generation. Fixed Sunday selected-week handling and body-goal projection date arithmetic. Latest CI run [#38686272529](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38686272529) passed on `a4d12bd71b5bf11a8091cdbb3884674a09b590c6`: TypeScript, Jest, and Expo config/assets all succeeded (38 suites / 284 tests). Regression tests cover invalid keys, month/year boundaries, IST/UTC/negative-offset local-day conversion, DST transitions, and both week conventions. Audit confirms remaining UTC use in the Supabase Edge Function is intentional for server-side quota accounting and ISO timestamps representing instants remain UTC. Physical-device smoke testing remains unverified; the two developer-only delete-workout scripts still use UTC date-key derivation and are outside production app paths, queued for cleanup. |
| 4. Nutrition pipeline | Not started | One shared validated command path is the target. |
| 5. Profile/targets | Not started | Effective-dated history; existing PR #7 must be reviewed first. |
| 6. Workout/recovery | Not started | Existing app paths and real persistence tests must be mapped before changes. |
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
