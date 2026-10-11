# NutriLift redesign — canonical coding-agent instructions

## Read first
1. docs/redesign-v1/NUTRILIFT_REDESIGN_SPEC.md — product, visual, implementation and acceptance requirements.
2. docs/redesign-v1/mockups.html — interactive visual direction. Values shown are sample data only.
3. design-system/tokens.ts, app/(tabs)/_layout.tsx, and the route/query files cited in the spec.

This document and the v1 spec supersede older directions where they conflict: dark-first vs light-first, five primary destinations vs six equal tabs, and an all-545-images inspection gate. Keep the older Bevel blueprint/review ledger as reference research, not as a reason to block implementation indefinitely.

## Hard rules
- Work from current main on one scoped implementation branch. Do not merge open PRs #2, #3, #4, #5, #6 and #7 wholesale; they overlap. Diff and adapt changes individually.
- Preserve Expo Router, SQLite/Drizzle semantics, existing record IDs, Zustand state and data-query behavior. No broad rewrite.
- design-system/tokens.ts is the only runtime token source. Extend components in components/ui/ rather than creating a competing kit. Resolve or label the older purple design-system/nutrilift/MASTER.md as legacy.
- Follow the owner's defaults: dark-first, calm/editorial, voice-first Indian food logging, ≤2-tap access to voice, fast set entry, no guilt loops, no ads/social/leaderboards/wearables in v1.
- AI results are drafts. Never save parser output without an explicit user confirmation. No provider secret in client code, local storage or EXPO_PUBLIC_*; AI goes through an authenticated server-side gateway.
- Manual nutrition and workout entry must work offline. Automatic cloud sync and sign-in are not v1 requirements.
- Unknown data is not zero. Separate estimates, self-reports and device-derived values. Coach is read-only and evidence-bounded.
- Do not require individual native-resolution inspection of all 545 Bevel images before implementing. Review only the mapped images that inform the actual NutriLift flows, record observations vs estimates, and proceed with bounded scope.

## Workflow
1. Record baseline results for npx tsc --noEmit, npm test -- --runInBand, and npx expo-doctor when available.
2. Fix data, date and AI-security correctness before visual polish.
3. Canonicalize tokens and five-destination navigation.
4. Implement Today + Quick Log first, then Nutrition, Train, Progress, Coach, More/settings and onboarding/error states.
5. After each phase, test persisted data, offline use, keyboard/safe areas, Android back behavior, and route restoration.
6. Test on a real mid-range Android and report untested behavior honestly.

## CI/EAS distinction
Recent workflow logs show EAS rejecting remote Android builds because the account exhausted its monthly free-build allowance. That is a quota denial, not evidence of a TypeScript/test failure. Keep normal CI checks independently runnable; mark APK build blocked by quota until the allowance resets.

## Done
All checkboxes in docs/redesign-v1/NUTRILIFT_REDESIGN_SPEC.md §10 must pass or be marked blocked with evidence. HTML mockups alone do not count as Android acceptance.