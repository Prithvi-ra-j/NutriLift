# NutriLift baseline defect and PR disposition register

**Audited at:** 2026-10-16  
**Repository:** https://github.com/Prithvi-ra-j/NutriLift  
**Implementation branch:** `implementation/phase-0-baseline`  
**Audited implementation commit:** `8e308ff3d9a118ef7d79c848c3ee22c2cf94c651`  
**Current `main` at audit:** `b5b37b3aa88b84f1dda557da3a1845a87e6a79e7`  
**Known branch base:** `843cafd469d863d4d12380dda7fdbe9ab02fffda`

This register separates source defects, validation gaps, account/environment blockers, and overlapping pull requests. A passing automated workflow is not a device/release pass. No wearable integrations are in scope; recovery remains manual.

## Validation baseline

| Check | Status | Evidence / interpretation |
|---|---|---|
| Clean locked dependency install | PASS | Node 22, `npm ci --legacy-peer-deps` in validation run [#38844029940](https://github.com/Prithvi-ra-j/NutriLift/actions/runs/38844029940). |
| Strict TypeScript | PASS | Same run, TypeScript step completed successfully on `8e308ff`. |
| Jest | PASS | Same run: **70 suites / 512 tests passed**. |
| Expo public config | PASS | Same run, `npx expo config --type public` passed. |
| Referenced local assets | PASS | Same run validated all four configured asset paths. |
| Native Android build artifact | BLOCKED / NOT VERIFIED | Previous EAS attempt was quota-blocked; quota exhaustion is not a source compilation result. No installable artifact is evidenced by this run. |
| Device fresh install / upgrade / interruption smoke | NOT RUN | Requires Android emulator/device evidence; automated Node tests are not a substitute. |
| External Vercel check | ENVIRONMENTAL FAILURE REPORTED | Prior sampled status indicated build-rate-limit failure. Keep separate from GitHub validation conclusions. |

## Defect register

| ID | Severity | Area | Finding / impact | Disposition / evidence |
|---|---|---|---|---|
| BASE-001 | P0 | Build validation | The original build workflow could start a quota-consuming EAS build without cheap type/test/config gates. | Added Node 22 validation workflow; latest run #38844029940 passes install, typecheck, Jest and Expo config/assets. Android artifact remains a separate gate. |
| BASE-002 | P0 | Type integrity | Production imports referenced missing UI primitives and strict typechecking exposed them. | Added the missing primitive and made strict TypeScript a required validation step; latest run passes. |
| BASE-003 | P1 | Database migrations | Runtime migration/schema drift could leave existing installs missing tables or columns; unsafe future-version handling could mutate a newer DB. | Runtime schema assertions, schema version guard and SQLite migration tests are present; device upgrade smoke remains pending. |
| BASE-004 | P1 | Calendar correctness | UTC string slicing could assign events to the wrong local date; week conventions differed across views. | Canonical local-date utilities and regression tests cover boundaries, offsets, DST and week conventions; device journeys remain pending. |
| BASE-005 | P1 | Nutrition data integrity | Parser failure/invalid quantities could lead to incomplete or misleading food logs and stale totals. | Shared validation, local-first parsing, transaction-scoped writes and edit/delete aggregate handling implemented; latest suite is green, full device acceptance pending. |
| BASE-006 | P1 | Profile and targets | Personal defaults and static targets could override actual user data; historical target comparisons could use the wrong version. | Persisted profile and effective-dated targets wired into Settings, dashboard, Progress, reports, exports and Coach context. Regression coverage passes; review remaining default fallbacks when no profile/target exists as intentional generic defaults. |
| BASE-007 | P1 | Workout integrity | Invalid set values, illegal lifecycle transitions, edits to closed sessions and progression from incomplete sessions could corrupt training history. | Session lifecycle and guarded set writes are implemented; progression is based on completed sessions; validation and recovery/error handling tests pass. Device interruption/resume remains unverified. |
| BASE-008 | P1 | Recovery semantics | Missing check-in values could be mistaken for neutral scores or absent sync fields could erase previously recorded facts. | Partial recovery summaries preserve unknown values; sync distinguishes omitted fields from explicit clears; regression tests pass. Manual recovery only. |
| BASE-009 | P1 | Coach integrity | Recommendations must not infer missed workouts from absent rows, persist provider errors as assistant answers, or change canonical facts. | Current state snapshot uses persisted nutrition/targets/workouts/manual recovery; outcomes are persisted; Coach free-text still calls the configured LLM and provider failures remain errors. Candidate rules are separate from conversational answers. |
| BASE-010 | P1 | Sync / event propagation | Local mutations need durable event/outbox behavior and retry-safe projection updates. | Domain events/outbox and sync retry/recovery tests exist; current recovery-field omission semantics were corrected and latest full suite passes. Cross-account/device acceptance remains pending. |
| BASE-011 | P2 | Privacy / defaults | Source defaults included personal notes or personal identity and supplement defaults could be presented as user facts. | Replaced personal source defaults with generic values and removed personal notes/supplement defaults from UI; profile stays empty until supplied by the user. |
| BASE-012 | P2 | Observability | Diagnostics must validate input and redact sensitive fields without eagerly requiring the DB. | Telemetry input validation and redaction tests added; full operational-health UI and production observability review remain outside this phase's acceptance. |

## Open pull-request disposition

No overlapping PR is merged or closed by this register. Do not merge these branches wholesale: several are stale, conflict with one another, or overlap with the current implementation.

| PR | Theme | Disposition |
|---|---|---|
| [#1](https://github.com/Prithvi-ra-j/NutriLift/pull/1) | Android EAS build stabilization | Reuse only independently verified build/config fixes. The current validation workflow is the cheap gate; do not reintroduce quota-consuming builds before it passes. |
| [#2](https://github.com/Prithvi-ra-j/NutriLift/pull/2) | Broad mobile redesign (85 files) | Defer. Large UI/navigation changes are not a baseline repair and overlap with #5/#6. |
| [#3](https://github.com/Prithvi-ra-j/NutriLift/pull/3) | P0 reliability/security repairs | Superseded/overlapping. Port a specific fix only if it is absent from current code and has a reproducing test. |
| [#4](https://github.com/Prithvi-ra-j/NutriLift/pull/4) | Broad production hardening (103 files) | Do not merge wholesale; overlaps #3 and the current branch across build, persistence, and UI. Review by file/contract after the current branch stabilizes. |
| [#5](https://github.com/Prithvi-ra-j/NutriLift/pull/5) | Editorial dark UI polish | Defer until core data journeys and target/workout/recovery correctness are stable. |
| [#6](https://github.com/Prithvi-ra-j/NutriLift/pull/6) | Bevel-inspired UI foundation | Competes with #2/#5. Select one design-system direction later; do not merge both blindly. |
| [#7](https://github.com/Prithvi-ra-j/NutriLift/pull/7) | Adaptive calorie targets | Current implementation branch contains the effective-dated target/profile and estimator work. Do not merge the stale PR on top; compare remaining unique changes before closing it. |
| [#8](https://github.com/Prithvi-ra-j/NutriLift/pull/8) | Current implementation/validation branch | Keep draft until the current head is reviewed against current `main`; branch is based on `843cafd`, while `main` is now `b5b37b3`. Reconcile that one-commit baseline difference and resolve GitHub mergeability/conflicts before merge. |

## Exit decision

The Phase 0 *audit baseline* is reproducible and classified: install, TypeScript, Jest and Expo config/assets pass on the implementation head; the Android artifact and device checks are explicitly unverified; the EAS quota event is not misclassified as a source failure; and overlapping PRs have explicit dispositions.

**Do not call the product release-ready.** The remaining release gate is a mergeable, reviewed branch plus Android artifact/device evidence. Phase 5–7 implementation claims are limited to the tested branch, not `main`.
