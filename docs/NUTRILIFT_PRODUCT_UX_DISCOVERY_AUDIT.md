# NutriLift Product & UI/UX Discovery — Verified Answer Set

**Repository audited:** https://github.com/Prithvi-ra-j/NutriLift  
**Default branch inspected:** `main` (commit `a7b627f6bfd9b71bb0f92bf242376c8e686844cd`)  
**Audit date:** 2026-10-11

> **Evidence labels**
> - **Verified:** supported by current default-branch repository contents.
> - **Inferred:** likely based on the code, but not definitive.
> - **Proposed:** recommended product/design default, not an implemented or measured fact.
> - **Needs owner confirmation:** only the product owner can answer.

## Key audit corrections

1. NutriLift is an Expo SDK 54 / React Native / TypeScript / Expo Router app targeting Android and web; it is not PWA-only.
2. Native storage is local-first SQLite/Drizzle. AI calls require network access and an authenticated Supabase Edge Function. Supabase sync code is present, but a real project/configuration and end-to-end validation are required.
3. `main` currently exposes six destinations: Home, Nutrition, Workout, Coach, Progress, More. Redesign PRs #2, #4, #5, #6 and #7 are not all merged. Do not treat draft-branch changes as shipped.
4. Existing production tokens in `design-system/tokens.ts` use dark surfaces, teal `#00D4AA`, blue protein accents, purple workout accents; the package includes DM Sans and Bebas Neue fonts. A separate `src/core/theme/colors.ts` defines Material 3 purple themes. Consolidate; do not assume `src/` reference components are active production UI.
5. The README lists manual/voice/barcode/lookup food logging, workout sessions and sets, body/recovery records, AI food parsing/coaching/progress summaries and PDF report export.
6. Security discrepancy: README says provider keys belong server-side, and `lib/groq/client.ts` uses the Supabase Edge Function. However, `app/(tabs)/more.tsx` on `main` still stores a Groq key in AsyncStorage. PR #4 plans to remove that path. The security claim must be qualified until the fix is merged and verified.
7. Food parse flow and voice flow are not identical. Text food entry has item editing; voice flow presents parsed foods and saves them, but the reviewed voice screen's save function writes parsed items directly. A shared editable confirmation step is recommended.
8. Do not claim that Hinglish voice logging is unique, that onboarding meets a 60-second threshold, that logging already takes two taps, or that success/retention metrics have been measured.

## A. Purpose and users (1–8)

1. **What does it do?** NutriLift combines nutrition tracking, strength-training logs, body progress, recovery records, and AI-assisted coaching in one mobile-first app. **Verified.**
2. **What's the one job?** Help users consistently track what they eat and how they train, then understand whether they're progressing toward fitness goals. **Proposed positioning.**
3. **What would they do without it?** Use separate nutrition trackers, workout loggers, spreadsheets, notes, and general-purpose AI tools. **Inferred.**
4. **Only you or other people?** Optimize for the owner's own daily use first while preserving clean architecture for future users. Confirm the intended launch scope. **Needs owner confirmation.**
5. **Who are the users?** Initially a tech-savvy fitness enthusiast and solo builder; later, potentially nontechnical gym-goers on mid-range Android. **Proposed.**
6. **Where and when?** At meals, between sets in the gym, and when reviewing progress or coaching. **Proposed.**
7. **One-handed?** Design one-handed first with reachable actions, generous targets, readable contrast, and voice input. Validate noise/glare conditions. **Proposed.**
8. **Frequency/duration?** Several short food logs a day, fast set entries during workouts, longer progress/coach reviews weekly. Exact timings must be measured. **Proposed.**

## B. Feel and taste (9–13)

9. **Three adjectives:** Fast, calm, confident. **Proposed.**
10. **Reference apps:** Bevel for dashboard presentation; Pinterest for editorial hierarchy; Strong or Hevy for set-entry speed. References are documented/proposed, not confirmed personal favorites. **Partly verified / needs confirmation.**
11. **Avoid:** Ads, bloated dashboards, redundant cards, excessive gradients, unnecessary animations, visual noise. **Proposed.**
12. **Never feel:** Clinical, spreadsheet-heavy, childish, or judgmental. **Proposed.**
13. **Theme:** Dark-first matching the current product; consolidate the dark system before deciding whether a light theme belongs in this release. **Dark-first verified; light scope needs confirmation.**

## C. Core loop and moments (14–17)

14. **Daily loop:** Home → calorie/protein glance → food entry → train and log sets → workout summary/PR → later progress review. **Proposed.**
15. **First open / aha:** Ask only essential profile/goals, then demonstrate logging. Let a user enter “2 roti, dal, curd” and review an editable estimate. Under 60-second onboarding is a target, not a proven result. **Proposed.**
16. **Cinematic moment:** Completing a workout with a genuine PR, restrained haptics and a summary grounded in recorded data. **Proposed.**
17. **Most frequent action:** Food logging, with voice accessible from Quick Log. Set entry should repeat previous values quickly. “Two taps” is acceptance criteria to test, not an existing guarantee. **Proposed.**

## D. Content and screens (18–20)

18. **Main destinations:** Current `main` has Home, Nutrition, Workout, Coach, Progress and More. Keep routes while improving design; a five-tab model would be a deliberate IA change. **Verified.**
19. **Primary data:** Calories/protein consumed and remaining, today's workout status and next action. Secondary: carbs, fat, body measurements, weight trends and self-reported recovery. **Proposed.**
20. **Density:** Home = one dominant nutrition summary plus a few supporting sections; Workout = current exercise and sets; Progress can be denser. **Proposed.**

## E. Behavior and motivation (21–27)

21. **Data entry:** Text, voice, barcode and lookup are existing pathways; improve portion correction, recent/repeat foods, and editability. **Verified + proposed improvement.**
22. **Behaviors to reinforce:** Same-day food tracking, protein consistency, planned workouts and sustainable weight-trend review. **Proposed.**
23. **Why people quit:** Repetitive logging, complexity, workout interruption, inaccurate estimates, guilt after missed days. Research-informed hypotheses, not confirmed reasons for the owner. **External anecdotal evidence.**
24. **Streaks/XP:** Weekly consistency indicators and genuine PR markers; no XP economy or arbitrary unlocks. **Proposed.**
25. **Notifications:** Off by default; optional, user-controlled meal/workout reminders with a conservative cap. **Proposed.**
26. **Missed days:** Forgive them, preserve prior achievements, distinguish missing data from zero, and offer a simple restart. **Proposed.**
27. **Social:** Solo-first; no social feed or leaderboards in initial redesign. Revisit only with evidence of demand. **Proposed.**

## F. AI (28–31)

28. **AI functions:** Food parsing, voice transcription, coaching and progress summaries are represented in the codebase. Parser prompt targets Indian foods and Hinglish; it is not a guaranteed food database. **Verified.**
29. **Autonomy:** AI drafts, user reviews and confirms before save. AI must not silently mutate targets or records. **Recommended guardrail.**
30. **When wrong:** Editable quantities/ingredients/macros, uncertainty flags, original input retained where useful, correction without restart. Do not imply guesses are measured facts. **Recommended.**
31. **Personality:** Direct, neutral, numbers-first, concise, no forced hype; acknowledge insufficient data. **Proposed.**

## G. Technical constraints (32–36)

32. **Platform/offline:** Expo SDK 54, React Native, Expo Router; Android and web targets. Native app uses SQLite/Drizzle locally. Web does not have equivalent native SQLite persistence; AI needs network and authenticated backend. **Verified.**
33. **Devices:** Android-first, small mid-range screens as minimum design reference; web is a development target. iOS bundle configuration exists but release priorities need confirmation. **Partly verified.**
34. **Stack:** TypeScript, Expo/React Native, Expo Router, SQLite, Drizzle ORM, Zustand/Immer, NativeWind/Tailwind, shared production components and Supabase/Groq gateway. Do not assume shadcn is active production UI. **Verified.**
35. **Team/timeline:** Owner-led repository and AI coding-agent workflow appear likely. Deadline and polish budget are unknown. Prefer incremental PRs over giant unreviewed rewrites. **Partly inferred; timing needs confirmation.**
36. **Languages/accessibility:** English UI baseline; Indian-food terminology and Hinglish voice are priorities. Validate microphone permission, scalable text, contrast, touch targets, web keyboard accessibility and recoverable errors. **Partly verified + proposed QA.**

## H. Goals, risks, business model (37–40)

37. **Personal/portfolio/product?** `package.json` says private, but that does not establish intended launch. Proposed: personal daily-use product first, architecture open to growth. **Needs owner confirmation.**
38. **Success metrics:** Proposed targets: food logging on 5+ days/week, median food-entry under 10 sec, 80%+ planned workouts logged, meaningful day-30 use. Set baseline and instrument before claiming success. **Proposed targets.**
39. **Privacy:** Body/nutrition/recovery data is sensitive. Local SQLite doesn't mean all data stays on-device. Document AI payloads, minimize context, keep provider secrets server-side, offer deletion/export, test sync isolation. **Risk verified; required safeguards proposed.**
40. **Monetization:** None required for this redesign. Later, consider premium reports/coaching while keeping essential logging free. No paywalls in core flows for this pass. **Proposed.**

## I. Current state (41–44)

41. **Screenshots:** Instructions call for Home, Nutrition, Workout, Coach, Progress, More, food log, barcode confirm and empty/failure states. Physical-device screenshots were not supplied here; real-device verification hasn't been performed in this audit. **Repo instructions verified; device evidence missing.**
42. **Biggest annoyance:** Evidence suggests overlapping redesign branches, duplicate theme systems, inconsistent flows, and incomplete validation. Owner's actual biggest annoyance needs confirmation. **Inference.**
43. **Keep:** NutriLift name, dark-first identity, data/persistence semantics, real workout/nutrition flows, and teal/blue/purple semantic palette as starting point. Consolidate duplicated tokens. **Proposed based on code.**
44. **Locked:** Preserve local data compatibility, route behavior, workout history, nutrition calculations and data contracts. Visual hierarchy/components can evolve. Don't force five tabs without deciding what to combine. **Proposed.**

## J. Brand (45)

45. **Name/logo/tagline/voice:** Keep “NutriLift.” Icon references and font dependencies exist, but all assets aren't thereby proven visually final. Proposed tagline: “Eat with clarity. Train with intent.” Voice: concise, direct, evidence-aware; no forced exclamation marks or Coach emojis. **Name verified; tagline/voice proposed.**

## K. Time and longevity (46–48)

46. **Day 1/30/365:** Day 1 teaches food logging. Day 30 surfaces useful recorded trends and PRs. Day 365 supports searchable history, reliable summaries, and fast recent-food/workout reuse. Cover empty, typical and large-history states. **Proposed.**
47. **Staying fresh:** Insights based on real history, clearer trends, PR history and grounded personalization—not arbitrary unlocks. **Proposed.**
48. **After a break:** Welcome back without judgment, preserve history, make the next action easy, and distinguish missing records from zero intake/activity. **Proposed.**

## L. Emotion and failure (49–51)

49. **After a bad day:** In control, informed and able to restart, not ashamed. **Proposed.**
50. **Worst cases:** Incorrect estimates, data loss, stale/duplicate sync, timezone errors, workout-state loss, and overconfident AI advice. Existing audit notes identify several sync/date/AI-context risks. **Risks grounded in repo audit.**
51. **Fixing mistakes:** Visible undo, editable entries, recalculated totals, clear retry states and edit history where useful. Bulk operations should be explicit. **Proposed.**

## M. Data and ownership (52–54)

52. **Export/backup/import:** PDF report export is already listed in README. Add CSV export and JSON backup/restore as recommended work; tracker import later. **PDF verified; others proposed.**
53. **Sync:** Keep optional authenticated Supabase sync architecture, but call it configuration-dependent. Do not promise end-to-end cross-device correctness until tested. **Partly verified.**
54. **Units/day boundary:** Metric default; optional lb toggle. Use correct local calendar dates/timezone. A 4 AM nutrition-day cutoff may fit sleep patterns but is a behavior change requiring owner approval and migrations/tests. **Metric and timezone policy proposed; 4 AM needs confirmation.**

## N. Surfaces (55–57)

55. **Widgets/shortcuts:** Investigate Android voice-log shortcut and safe notification actions first. Watch integration out of initial scope unless there's a concrete requirement. **Proposed.**
56. **Share moment:** Optional privacy-conscious PR cards; hide body weight by default. **Proposed.**
57. **Sound/haptics:** Subtle haptics for meaningful confirmation/PRs; sound off by default. Validate on Android hardware. **Proposed.**

## O. Process and scope (58–65)

58. **Deliverables:** Standalone Markdown spec plus HTML mockups with tokens, screen specs, states, interaction rules and acceptance criteria. **Requested format.**
59. **Implementer:** AI coding tools working in the existing repository. **Based on stated workflow.**
60. **Decider:** Product owner. **Needs confirmation if shared ownership exists.**
61. **Definition of done:** One token set across all destinations; tested food/set entry; correct local persistence; responsive and real-device screenshot QA; relevant CI passing. “Five destinations” must be replaced with final approved IA. **Proposed.**
62. **Prior attempts:** PR #1 addressed Android build stability; PR #2 introduced major redesign foundation; PRs #4–#7 contain further hardening/design/target work, several as unmerged drafts. Code proves attempts, not why directions were abandoned. **Verified plus owner context needed.**
63. **Out of scope:** Propose no social/leaderboards, wearables or decorative gamification. Light theme can be deferred. Evaluate existing PDF/advanced features deliberately rather than claim they don't exist. **Proposed.**
64. **Cut first:** Defer elaborate Smart Reports, elaborate templates and nonessential animation before core logging/reliability. **Proposed.**
65. **Defend:** Fast, reviewable food logging and fast, reliable workout set logging. **Proposed product priorities.**

## P. Real-use check (66–67)

66. **Where do you personally open it most?** Likely around meals and gym sessions, but exact screen/context is not in the repository. **Needs owner confirmation.**
67. **Last annoyance and exact sequence?** The repo documents potential engineering/UX faults, but not the owner's last real-world annoyance. **Needs owner confirmation.**

## Research evidence and source links

- Repo README: https://github.com/Prithvi-ra-j/NutriLift/blob/main/README.md
- Production tokens: https://github.com/Prithvi-ra-j/NutriLift/blob/main/design-system/tokens.ts
- Current app routes: https://github.com/Prithvi-ra-j/NutriLift/tree/main/app/%28tabs%29
- AI gateway: https://github.com/Prithvi-ra-j/NutriLift/blob/main/supabase/functions/ai-chat/index.ts
- UI redesign blueprint: https://github.com/Prithvi-ra-j/NutriLift/blob/main/docs/BEVEL_UI_UX_REDESIGN_BLUEPRINT.md
- Draft PR #5 editorial dark UI: https://github.com/Prithvi-ra-j/NutriLift/pull/5
- Draft PR #6 Bevel-inspired UI foundation: https://github.com/Prithvi-ra-j/NutriLift/pull/6
- Draft PR #7 adaptive targets/data quality: https://github.com/Prithvi-ra-j/NutriLift/pull/7
- Reddit anecdotal food-tracking friction: https://www.reddit.com/r/loseit/comments/1nl9i79/how_do_you_stay_consistent_with_meal_tracking/
- Reddit anecdotal workout logging friction: https://www.reddit.com/r/workout/comments/1skdnuc/does_anyone_else_feel_like_workout_logging_still/
- Reddit anecdotal AI logging inaccuracies: https://www.reddit.com/r/fitbit/comments/1w4gmks/the_ai_coach_food_logging_is_so_inaccurate_its/
- Competitors publicly describing Hinglish/Indian-food logging: https://getsehat.app/faq/ and https://beeraai.in/

**Remaining owner-only decisions:** launch scope, favorite details from reference apps, actual biggest annoyance, reason prior redesigns didn't stick, approved tab count/day boundary, and the exact most recent real-use failure.
