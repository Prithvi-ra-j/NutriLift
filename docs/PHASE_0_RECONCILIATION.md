# Phase 0 — Baseline and PR reconciliation

Last reviewed: 2026-10-16

## Baseline

- Canonical integration branch: `implementation/phase-0-baseline`
- Branch creation/base commit: `843cafd469d863d4d12380dda7fdbe9ab02fffda`.
- Current `main` head at this audit: `b5b37b3aa88b84f1dda557da3a1845a87e6a79e7` (the intervening commit adds the UX discovery audit). The implementation branch has not incorporated that main-branch commit; GitHub reported PR #8 as not mergeable, so recheck/reconcile before merge.
- Canonical implementation PR: [#8 — incremental implementation and validation baseline](https://github.com/Prithvi-ra-j/NutriLift/pull/8)
- No changes from this implementation branch have been merged into `main`.
- Latest successful code validation: [GitHub Actions run #38844029940](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38844029940) on code commit `8e308ff`, with Node 22 dependency install, strict TypeScript, Jest (70 suites / 512 tests), and Expo config/assets. The subsequent baseline documentation commits have their own validation run pending.

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

The audit baseline is reproducible, but the implementation PR is not merge-ready merely because checks pass. Before merging, update the branch from current `main` or otherwise resolve the single intervening main-line commit, inspect any content conflict, and confirm GitHub reports PR #8 mergeable. Do not force-push or merge automatically as part of this phase.
