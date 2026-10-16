# Phase 0 — Baseline and PR reconciliation

Last reviewed: 2026-10-16

## Baseline

- Canonical integration branch: `implementation/phase-0-baseline`
- Branch creation/base commit: `843cafd469d863d4d12380dda7fdbe9ab02fffda`.
- Current `main` head at this audit: `b5b37b3aa88b84f1dda557da3a1845a87e6a79e7`. This commit was incorporated as the second parent of the implementation branch's integration merge commit. The branch version of `lib/db/__tests__/migration-contract.test.ts` was retained because it covers schema v15 and the expanded profile/nutrition/sync columns; the main version reflects the older schema-v9 contract.
- Canonical implementation PR: [#8 — incremental implementation and validation baseline](https://github.com/Prithvi-ra-j/NutriLift/pull/8)
- No changes from this implementation branch have been merged into `main`.
- Latest successful code validation: [GitHub Actions run #38844503903](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38844503903) on code commit `5fe7f44`, with Node 22 dependency install, strict TypeScript, Jest (71 suites / 517 tests), and Expo config/assets. The integration merge commit preserves this tested code tree; its validation is pending.

## Existing PR overlap map

| PR | Scope | Disposition |
|---|---|---|
| [#1](https://github.com/Prithvi-ra-j/NutriLift/pull/1) — Android EAS preview build | Build workflow and release/build configuration | Keep as reference; do not merge independently until the validated workflow and an installable artifact are reconciled. The earlier EAS failure was quota-related, not proof of source compilation failure. |
| [#2](https://github.com/Prithvi-ra-j/NutriLift/pull/2) — mobile redesign foundation | Broad cross-screen redesign | Defer until correctness/reliability gates are stable. Overlaps with #5, #6, and current app screens. |
| [#3](https://github.com/Prithvi-ra-j/NutriLift/pull/3) — P0 reliability/security repairs | Cross-cutting data, reliability, and security fixes | Do not merge wholesale. Compare any unique security fixes against the validated baseline before deciding whether to cherry-pick. |
| [#4](https://github.com/Prithvi-ra-j/NutriLift/pull/4) — production hardening | Broad release hardening and quality changes | Overlaps #1, #3, and #8. Reconcile unique release/security changes individually; do not combine competing workflows. |
| [#5](https://github.com/Prithvi-ra-j/NutriLift/pull/5) — Pinterest-style design polish | Visual polish and alignment | Defer. This is a competing design direction with #6 and is outside phases 0/5/6/7. |
| [#6](https://github.com/Prithvi-ra-j/NutriLift/pull/6) — Bevel-inspired UI foundation | Alternative UI foundation | Defer. Choose a single design direction after correctness and persistence are stable. |
| [#7](https://github.com/Prithvi-ra-j/NutriLift/pull/7) — adaptive calorie targets | Target logic and data-quality safeguards | The current branch now has validated target history, explicit-quality gates, bounded suggestions, and persisted profile/goal fields. Do not merge the PR wholesale; inspect only for unique tests or fixes not represented in #8. |
| [#8](https://github.com/Prithvi-ra-j/NutriLift/pull/8) — incremental implementation baseline | Small evidence-backed changes, validation, profile/target, workout/recovery, Coach | Canonical working branch for this implementation. Remains draft until device/release checks and final PR review are complete. |

## Decision

PRs #1–#7 remain open intentionally. Their overlap has been mapped and the merge order is explicit, but I have not closed or merged someone else's PR as a side effect of implementation. The remaining governance decision is whether to close or supersede those PRs after reviewing their unique commits. No broad rewrite or wearable integration was introduced.

## Remaining release gates

- Physical-device fresh install and upgrade through schema v15.
- Workout set save/retry, interruption recovery, and history verification on device.
- Recovery check-in save/reload and optional-field verification on device.
- Coach provider integration smoke test with missing profile fields and provider failure.
- Produce/install an Android artifact after EAS quota is available.


## Main/branch integration gate

The audit baseline is reproducible and current `main` ancestry has been incorporated into the implementation branch. GitHub now reports PR #8 mergeable after ancestry reconciliation. Before merging PR #8 into `main`, review the final diff and complete the Android/device release gates. This phase did not merge the implementation PR into `main`.


## Integration merge record

The implementation branch now includes current main commit `b5b37b3aa88b84f1dda557da3a1845a87e6a79e7` as a second parent. The resulting tree deliberately retains the branch's schema-v15 migration contract and tests rather than the older schema-v9 test from main. This reconciles ancestry without merging the implementation into main or closing the overlapping PRs.
