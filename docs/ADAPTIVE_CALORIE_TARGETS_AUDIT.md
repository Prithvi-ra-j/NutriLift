# Adaptive Calorie Targets — Source Audit

**Audit date:** 2026-10-11  
**Repository:** [Prithvi-ra-j/NutriLift](https://github.com/Prithvi-ra-j/NutriLift)  
**Scope:** Source-level audit for adaptive calorie targets; no application code changed and no tests were run during this audit.

## Executive summary

**Adaptive calorie targets are not currently implemented.** NutriLift has most of the raw local data ingredients—dated food logs, daily nutrition aggregates and dated body-weight measurements—but its target values are compile-time constants and downstream calculations assume they never change. Adding a formula alone would be unsafe: the app first needs a persisted source of truth for targets, an explicit way to identify complete food-log days, reliable calendar-day trend calculations, and regression tests.

Recommended order:

1. Persist profile/targets and target history without breaking existing installs.
2. Fix data-readiness and date semantics needed for calibration.
3. Add a deterministic adaptive-estimation module with strict minimum-data and bounded-change rules.
4. Route all UI, analytics, exports and coach context through the target repository.
5. Add tests and validate on Android before enabling automatic updates.

## What exists today

- **Hard-coded target source:** `lib/constants/user-profile.ts` defines 2,500 kcal, 155 g protein, 240 g carbs and 65 g fat. The exported object is `as const`, so it is static application configuration.
- **Local food logging:** `lib/db/schema.ts` has `food_logs`; `lib/db/queries/nutrition.ts` inserts, updates and deletes food entries, then recomputes the daily aggregate.
- **Daily derived summaries:** `daily_nutrition` stores calories/macros and target-derived fields (`protein_target_met`, `calorie_target_met`, `adherence_score`).
- **Weight data:** `body_stats` stores dated weight entries and InBody measurements. `getWeightHistory()` reads entries whose type is `weight`.
- **Read-only Settings display:** `app/(tabs)/more.tsx` renders profile/target values but the target rows are not editable.
- **Existing personalization context:** coach/weekly analysis paths still read values from `USER_PROFILE`.
- **No adaptive target engine or target history was found** in the audited default-branch source. The local schema also has no dedicated persisted user-profile or nutrition-target history table.

## Findings

### P0 — Targets have no persisted source of truth

**Evidence:** `lib/constants/user-profile.ts`; read-only profile/target section in `app/(tabs)/more.tsx`; schema in `lib/db/schema.ts`.

Targets currently live in source code. There is no local profile/target repository for the app to update, and Settings displays but does not edit them. This blocks adaptation, survives only as source-code configuration, and creates risk of inconsistent values when separate modules are changed independently.

**Recommendation:** introduce a typed local-first profile/target repository. Keep the current constants as backward-compatible migration defaults, not as the ongoing read path. Extend both Drizzle schema and the authoritative `runMigrations()` SQL path; the app uses manual additive SQLite migrations, so changing only the Drizzle schema is insufficient.

### P0 — Intake completeness cannot be inferred from daily summaries

**Evidence:** `lib/db/queries/nutrition.ts` — `recomputeDailyNutrition()`, `getLast7DaysNutrition()`; `lib/db/schema.ts` — `food_logs` and `daily_nutrition`.

A daily summary is deleted when a date has no food rows and created only after food is logged. Therefore a missing date and a partially logged date are not distinguishable from a fully logged day using the aggregate alone. `getLast7DaysNutrition()` returns existing summary rows, not seven explicit calendar-day states. Average calories over available rows can be biased by skipped or partially logged days.

There is an additional trust issue: the food-input fallback in `app/modals/log-food.tsx` creates a low-confidence parsed item with all calorie/macronutrient values set to zero. The user can proceed to save that item, and the stored `food_logs` row does not persist the parser's confidence field.

**Recommendation:** add an explicit daily logging-completeness signal (for example, a user-confirmed complete day) and persist food-entry estimate quality/review status. Do not feed incomplete or unresolved zero-valued parses into expenditure estimation as though they were measured intake.

### P0 — Historical adherence has no target snapshot/history

**Evidence:** `lib/db/schema.ts` — `daily_nutrition`; `lib/db/queries/nutrition.ts` — `recomputeDailyNutrition()`.

Target-met flags and adherence score are calculated against the current hard-coded values when food entries change. The daily row does not preserve the actual calorie/protein target used for that day, and no effective-dated target history was found. If the target changes, historical adherence can become ambiguous or wrong if old summaries are recomputed using the new target.

**Recommendation:** maintain effective-dated target history and snapshot the applied targets on daily summaries (or always resolve the historical target by date). A migration should record the legacy defaults for existing summaries; it should not silently rewrite history as if the new target had always applied.

### P1 — Existing rolling average is observation-count based, not calendar-day based

**Evidence:** `lib/db/queries/body.ts` — `computeRollingAverage()`.

The function named as a 7-day rolling average slices the last `windowDays` **entries**. If weigh-ins are irregular, seven observations may span more than a week. It also returns `0` when a window contains no valid weights, conflating missing data with a real measurement. It is not sufficient as-is for adaptive estimation.

**Recommendation:** implement and test a separate weight-trend helper using actual dates, valid measurements, robust smoothing/outlier handling, and an explicit “insufficient data” result rather than zero. Keep this calculation deterministic and independent of the LLM.

### P1 — Calendar date keys use UTC conversions

**Evidence:** `lib/db/queries/nutrition.ts`, `lib/db/queries/body.ts`, `app/modals/log-food.tsx`, and `lib/groq/agents/buildWeeklyContext.ts` use patterns such as `new Date().toISOString().split("T")[0]`.

A UTC ISO date is not necessarily the user's local calendar date. In India, entries logged just after midnight local time can be assigned the prior UTC date. Date-window boundaries can then skew daily intake/weight matching and the weekly model.

**Recommendation:** centralize local-calendar date generation and date arithmetic before implementing trend windows. Add timezone-boundary tests.

### P1 — Target dependencies are spread across UI, analytics and AI context

**Evidence found in:** `app/(tabs)/index.tsx`, `app/(tabs)/nutrition.tsx`, `app/(tabs)/more.tsx`, `app/(tabs)/progress.tsx`, `lib/db/queries/nutrition.ts`, `lib/analytics/nutrition-analytics.ts`, `lib/analytics/body-analytics.ts`, `lib/groq/agents/buildWeeklyContext.ts`, and `lib/export/generate-progress-pdf.ts`.

These paths directly reference profile constants or target-derived values. Changing the target in one place would not be enough: Home, Nutrition, progress summaries, target-hit flags, AI context and exported reports could disagree.

**Recommendation:** expose one async repository/API for active target and target-for-date. Make screens, aggregators, exports and coach-context builders consume that API; the AI may explain the result but must not be the calculation source of truth. Audit the remaining `USER_PROFILE` references during implementation.

### P1 — Current body-composition projection is not a calorie-adaptation engine

**Evidence:** `lib/analytics/body-analytics.ts`.

The existing body-fat projection contains a fallback weekly weight change (`-0.2`) and an assumed fat-loss share. That can produce projections even with limited trend evidence. It should not be reused to set calorie targets or presented as a validated expenditure estimate.

**Recommendation:** keep calorie/expenditure estimation separate from body-fat goal projections. When data is insufficient, return a clear unavailable/low-confidence state.

### P2 — Macro target totals do not reconcile to the calorie target

**Evidence:** `lib/constants/user-profile.ts`.

The configured macros add up to **2,165 kcal** using the standard 4/4/9 kcal-per-gram convention (155 g protein, 240 g carbs, 65 g fat), versus the 2,500 kcal target—a difference of 335 kcal. That could be intentional if some targets are independent or untracked intake is expected, but the app should make the relationship explicit rather than imply these four values reconcile.

**Recommendation:** choose and document whether calorie and macro goals are independently set or whether the calorie target should be reconciled with macro targets. Add a validation/warning rule if they are intended to align.

### Related integration limitation — food-level records are not in the current sync export

**Evidence:** `lib/integrations/life-os/syncRepository.ts` queries daily nutrition, workouts, PRs, body stats, recovery and tombstones; its current list does not query `food_logs`. The current nutrition export is a daily aggregate.

This does not block a local adaptive engine, but a Life OS consumer cannot reconstruct food-level evidence from the current export. Keep it out of the first calibration milestone unless the target engine itself is later moved off-device; track it as a separate data-integration decision.

## Proposed implementation sequence

### Phase 1 — Data foundation and backwards-compatible migration

- Add a singleton local profile/target repository with validated editable values.
- Add effective-dated target history. Record target mode/source (manual vs adaptive), effective date, expenditure estimate if available, confidence/data-quality summary, explanation/reason, and algorithm version.
- Store the applied calorie/protein targets with each daily summary, or resolve the effective target for the summary date consistently.
- Migrate current defaults (2,500 kcal / 155 g protein / 240 g carbs / 65 g fat) for existing installations without deleting history or rewriting past adherence under a new target.
- Add an explicit daily intake-completeness state and persisted source/confidence/review metadata for food entries.
- Centralize local calendar-day logic.
- Use both Drizzle definitions and the runtime SQL migration path. Test migration against an existing database, not only a fresh install.

### Phase 2 — Deterministic estimator, initially advisory

- Use only complete, quality-qualified nutrition days and valid dated weight measurements.
- Require a minimum history window and minimum coverage before estimating; show “building your baseline” when evidence is insufficient.
- Estimate expenditure from average logged intake and a smoothed multi-day weight trend, with transparent assumptions and bounded update size.
- Recalculate on a predictable cadence, not after every individual food or scale entry.
- Keep a manual override and make the reason for each target change visible.
- Do not let the LLM set numeric targets. It can explain deterministic estimates and limitations.

Suggested starting quality gates for testing—not universal nutrition rules—are roughly 2–3 weeks of data, most days explicitly marked complete, and a reasonable number of weigh-ins spread across that window. Tune these with simulations and the user's actual logging pattern before enabling automatic updates.

### Phase 3 — Propagate one source of truth

Refactor target reads in Home, Nutrition, Progress, Settings, food-summary calculations, analytics, reports and all coach-context builders to use the same repository. Recompute or snapshot target-derived fields in a way that preserves which target applied on each historical day.

### Phase 4 — Regression and device validation

Required test cases:

- Fresh install and upgrade of an existing `apex.db` without data loss.
- Target editing and target history across effective-date boundaries.
- Existing historical adherence remains tied to its original target.
- No logs, partial logs, complete logs and unresolved/zero-confidence parse.
- Regular, irregular, missing, duplicate and outlier weigh-ins.
- Date boundaries around local midnight in Asia/Kolkata and UTC.
- Sparse-data behavior returns “insufficient data,” never a fabricated estimate or a zero weight.
- Bounded target changes, manual override, offline restart and sync after reconnection.
- All screens, summaries, reports and Coach display the same active target.

## Exit criteria

Do not enable automatic target updates until:
- Profile/targets are persisted locally and migration-tested.
- Intake completeness and weight-trend quality gates work.
- Target history makes past adherence reproducible.
- A deterministic estimator is covered by unit tests and synthetic scenarios.
- TypeScript and the relevant Jest suite pass.
- An Android smoke test confirms offline persistence and consistent UI propagation.

## Key source files

- [Profile constants](../lib/constants/user-profile.ts)
- [SQLite schema](../lib/db/schema.ts)
- [Runtime SQLite migrations](../lib/db/client.ts)
- [Nutrition queries and daily aggregation](../lib/db/queries/nutrition.ts)
- [Weight history and rolling average](../lib/db/queries/body.ts)
- [Nutrition analytics](../lib/analytics/nutrition-analytics.ts)
- [Body analytics](../lib/analytics/body-analytics.ts)
- [More / Settings UI](../app/(tabs)/more.tsx)
- [Weekly AI context](../lib/groq/agents/buildWeeklyContext.ts)
- [Life OS sync export](../lib/integrations/life-os/syncRepository.ts)
- [P0 repair specification](./NUTRILIFT_P0_REPAIR_SPEC.md)
