# NutriLift Redesign V1 — Product and Implementation Spec

**Status:** Proposed implementation baseline. Owner preference defaults are authoritative except for the four unresolved items in §11.  
**Platform:** Existing Expo SDK 54 + React Native + TypeScript + Expo Router app.  
**North star:** Make logging a meal and logging a set so quick and trustworthy that the user continues after the novelty wears off.

## 0. Source-of-truth hierarchy

When sources conflict: (1) decisions in this spec, (2) actual behavior and data contracts on main, (3) design-system/tokens.ts, (4) mapped Bevel screenshot references as visual research, (5) older design docs/open PRs as history.

### Verified repo facts
- SQLite + Drizzle is the local persistence layer; Zustand/Immer manages app state.
- Routes currently include app/(tabs)/index.tsx, nutrition.tsx, workout.tsx, coach.tsx, progress.tsx and more.tsx.
- Food entry modals include app/modals/log-food.tsx and app/modals/voice-input.tsx; barcode-scanner.tsx and view-logs.tsx also exist.
- design-system/tokens.ts uses dark surfaces, teal primary, Bebas Neue display type, DM Sans UI type, a 4 dp spacing scale and shared shapes. app/_layout.tsx loads those fonts.
- design-system/nutrilift/MASTER.md has older purple tokens. It must not compete with the runtime token file.
- app/(tabs)/_layout.tsx currently defines six equal destinations. V1 has five: Today, Nutrition, Train, Progress and Coach. More/settings is reached through a profile/header control.
- Some main-branch date keys still use toISOString().split("T")[0]. These are not reliable local nutrition-day keys.
- The reference review report says 545/545 contact-sheet review is done but 545 individual native-resolution inspections are not. Do not claim they are; do not use all 545 native inspections as a blanket implementation gate.
- The latest Android workflow log reports EAS free-plan monthly Android build quota exhaustion. That is separate from source-code correctness.

Repo: https://github.com/Prithvi-ra-j/NutriLift  
History to avoid re-merging wholesale: [PR #2](https://github.com/Prithvi-ra-j/NutriLift/pull/2), [PR #3](https://github.com/Prithvi-ra-j/NutriLift/pull/3), [PR #5](https://github.com/Prithvi-ra-j/NutriLift/pull/5), [PR #6](https://github.com/Prithvi-ra-j/NutriLift/pull/6), [PR #7](https://github.com/Prithvi-ra-j/NutriLift/pull/7).

**Integration rule:** large, overlapping PRs remain open. Work from current main in one scoped implementation branch; diff any candidate changes file by file. Do not merge all redesign branches together or start another parallel redesign.

## 1. Product promise and audience

**One sentence:** NutriLift is a local-first Indian-food nutrition and strength-training tracker that turns natural meal descriptions—including Hinglish—and fast set entry into useful daily guidance.

**Job to be done:** “Help me hit my nutrition target and train consistently without turning every meal and set into admin work.”

Without it, a user may combine a notes app, a food tracker and a lifting log—or quit because logging is too tedious. Voice alone is not a durable differentiator; the combination is Indian-food-aware voice/text logging, training, local history and context-aware coaching in one app.

Design for the owner first. Keep data structures clean for future users, but do not optimize v1 around growth or social features. If opened up later, support non-technical gym-goers on mid-range Android.

## 2. Experience principles

- **Fast:** food actions begin in one or two taps; set entry stays in the workout context.
- **Calm and confident:** no ad clutter, shame language, guilt colors, fake urgency or excess cards.
- **Trustworthy:** never silently save an AI parse, invent missing data or misrepresent self-reported metrics as sensor measurements.
- **Dark-first:** light theme is out of v1 scope. Bevel’s predominantly light screenshots do not override this product decision.
- **Thumb-first:** controls have at least 48 dp touch area and work one-handed in gym glare.
- **Editorial, not spreadsheet-like:** Today has one hero and 3–4 support areas. Train focuses on one exercise at a time. Progress may be denser.
- **No childish gamification:** no XP, levels, punitive streaks or fake unlocks. Actual PRs are the celebration.
- **One visual system:** one token set, one component grammar, consistent cards, sheets, typography and empty/error states.

Explicitly out of scope for v1: ads, social feeds, leaderboards, friends/challenges, wearables, light theme, required cloud sync, PDF export, and major rearchitecture. Cut Smart Reports and workout templates before compromising voice food logging or fast set entry.

## 3. Navigation and code map

### Five primary destinations
1. **Today:** remaining calories/protein, meals, training status and optional manual recovery check-in.
2. **Nutrition:** date navigation, meals, recent/repeat foods, totals, edit and delete.
3. **Train:** workout, active session, exercises, sets, rest timer, completion and PR summary.
4. **Progress:** strength PRs, weight/body measurements, nutrition averages, training adherence and recovery history.
5. **Coach:** concise, read-only advice tied to actual logged data.

**More/settings** (body, recovery, supplements, report history, account/integrations, privacy, export/backup and preferences) remains reachable from a profile/header control. Preserve existing routes during nav consolidation.

**Global Quick Log:** a floating thumb-reachable action above bottom navigation. Tap opens the Quick Log sheet; tap Voice opens recording (≤2 taps from any primary screen). The sheet offers Voice, Type, Recent and Barcode; only offer photo capture if it has a working production flow.

| Surface | Existing source | Direction |
|---|---|---|
| Today | app/(tabs)/index.tsx | Reorder actual store/query data; do not create another dashboard. |
| Nutrition | app/(tabs)/nutrition.tsx | Keep query-backed groups; fix local day keys. |
| Train | app/(tabs)/workout.tsx and features/train/components/* | Keep session/set services; simplify in-context entry. |
| Progress | app/(tabs)/progress.tsx | Reuse existing analytics and PR/body/nutrition/recovery queries. |
| Coach | app/(tabs)/coach.tsx | Keep conversation/context plumbing; enforce read-only advice and evidence coverage. |
| More/settings | app/(tabs)/more.tsx | Remove from primary nav hierarchy without dropping settings sections. |
| Navigation | app/(tabs)/_layout.tsx | Five primary destinations plus separate Quick Log action. |
| Food capture | app/modals/log-food.tsx, voice-input.tsx | Every capture method converges on editable confirmation. |
| Shared UI | components/ui/* | Extend Button, Card, EmptyState, ScreenHeader, MacroBar/MacroRing, etc. |
| Tokens | design-system/tokens.ts | Only runtime token source. |

Before adding components, inventory current query/store functions and extend existing production components rather than duplicating data access inside UI components.

## 4. Daily loop and speed targets

1. Open Today and see calories remaining, protein remaining and workout status.
2. Log a meal by voice or quick text, with common Indian foods and Hinglish accepted as ordinary input.
3. Review parsed items, portion, calories/macros, and source/confidence if available.
4. Edit any field; explicitly confirm Save.
5. Train, log sets rapidly, repeat a comparable last set, and keep rest timing visible.
6. Finish with duration, volume, any proven PR and one concise summary.
7. Review the day without guilt or false zeros.

Onboarding should take under 60 seconds, ask one goal question plus minimum profile information, and allow target review before save. No forced account, notification permission or paywall before basic logging.

The “aha” is saying “2 roti, dal, curd” and receiving a plausible editable draft quickly. A ~3-second parse is a performance target on a healthy connection, not a guarantee. Manual nutrition and workout logging must remain usable offline; explain when AI/voice parsing needs network access.

**Timing criteria:** Quick Log → Voice ≤2 taps; repeat-last-set is a one-tap prefill when a comparable set exists; start/resume workout from Today ≤2 taps. No nutrition parse or workout set may save without explicit user action.

## 5. Design system

### Canonical runtime palette and type
Use design-system/tokens.ts as the source of truth.

| Role | Value | Guidance |
|---|---|---|
| Background | #0F0F13 | Screen canvas |
| Base surface | #16161E | Cards |
| Elevated surface | #1E1E2A | Inputs, nested surfaces, sheets |
| Nav/chip surface | #22222F | Floating nav and low-emphasis chips |
| Primary | #00D4AA | Primary action, active state, progress |
| Primary text | #E8E8F0 | Main content |
| Muted text | #909090 | Helper text; verify contrast at actual sizes |
| Border | #2E2E3F | Key separators only |
| Display | Bebas Neue | Large values / rare display headlines |
| UI | DM Sans | Body, controls and explanatory text |

Keep the existing 4/8/12/16/20/24/32 dp rhythm and shape scale. Target WCAG AA contrast of at least 4.5:1 for normal text; adjust failing tokens centrally. Do not use red-vs-green to imply good/bad nutrition. Color is never the only way to communicate selection or status.

Cards use 16–20 dp radii and tonal surfaces before shadows. Avoid nested cards. One dominant CTA per screen. Motion is restrained (about 150–250 ms) and never delays a log. Respect reduced motion. Sound is off by default; haptics are on for successful save and actual PR, with a setting to disable them.

Resolve design-system/nutrilift/MASTER.md as archival or align its documentation to the canonical runtime tokens. Search imports before moving/deleting code. Do not add one-off screen palettes.

## 6. Screen requirements

### Today
- Header with date, profile/settings and friendly title.
- Hero shows calories consumed/target and remaining; protein shows grams and grams remaining.
- Fat/carbs are secondary. Keep the first viewport to one hero plus 3–4 supporting areas.
- Meal summary rows show actual logged count/time; tap opens Nutrition at the right date/meal.
- Workout status is one of not started / in progress / completed / rest day. Do not imply a session exists if it does not.
- Recovery is optional self-report, never a fabricated readiness score.
- If target or coverage is unknown, say so plainly instead of inventing a number.

### Quick Log and food confirmation
- Sheet actions: Voice, Type, Recent, Barcode. All lead to the same editable confirmation state.
- Voice flow covers permission denied, recording, transcribing, parsing, offline/network error and retry.
- Parse fields: item, portion/unit, calories, protein, carbs, fat, plus source/confidence when available. Every field can be edited.
- Parser output stays a draft. The user explicitly presses Save meal; unknown nutrients remain unknown, not zero.
- On success, haptic if enabled plus an ~8 second Undo action. Saved rows remain editable and deletable.
- On parse failure, preserve raw text and allow manual/numeric macro entry. Never lose input.
- Show recent/repeat foods first; check portion before re-adding when needed.

### Nutrition
- Selected local day, meal groups, calorie/protein summary and obvious add action.
- Entries remain editable/deletable; sorting and expanded state must not hide controls.
- Include Indian staples and allow custom food/portion when catalog lookup fails.
- Empty past day means no data, not a zero-calorie day.

### Train
- Make Start workout or the actual planned/recent session immediately obvious.
- Active workout focuses one exercise. Keep previous performance, set rows, add set, rest timer and finish action together.
- Support each existing exercise type (weight/reps, duration, distance, etc.). Prefill from last comparable set, never auto-complete.
- Repeat last set is a single-tap prefill. Numeric keyboard units are clear; entered values survive rerenders/navigation.
- Rest timer continues correctly across navigation/background using the current timer logic.
- Completion shows real duration/volume/PR only. Optional share card hides body weight by default.

### Progress
- Default 7-day view with workouts completed, average protein and a selected trend (e.g. weight).
- Sections for Strength, Body, Nutrition and Recovery.
- Show the data window and coverage. Gaps are not zeroes; label estimated/self-reported/measured data.
- PR history becomes searchable/recent-first and long lists are virtualized.
- Empty state explains the amount of data needed and offers the relevant action.

### Coach
- Direct, calm, numbers-first; no emojis, exclamation marks, hype or shame.
- Start with one observation and one next step. State coverage: “Based on 4 logged days…” rather than claiming full-week knowledge.
- Advice can discuss data but cannot create/edit food, sets or targets. Actions link to user-reviewed forms.
- Never diagnose or infer device signals that are absent. Retain typed prompt on failure and offer retry/manual alternatives.
- Disclose AI use: submitted voice/text and relevant context may be processed by the configured AI provider.

### Onboarding, empty states and return after a gap
- One main-goal prompt, minimum profile needed for target estimate, editable targets. Under 60 seconds.
- Day 1: invite one food log. Day 30: show true 7-day averages/PRs if data exists. Day 365: prioritize frequent/recent foods and virtualize histories.
- After a break: “Welcome back. Start with today.” Show last logged date and no guilt prompt.
- Missed days remain gaps. Never reset previous progress. Weekly training consistency may use grace rules, but cannot erase past sessions.

### More, privacy and data ownership
- Metric by default, optional pounds; IST; nutrition day rolls over at 04:00; notifications off by default, maximum two/day with quick actions only after opt-in.
- CSV export for logs and JSON backup of local data are essential. Delete has a clear explanation and confirmation.
- No automatic cloud sync is required for v1. Do not force sign-in/sync setup. Preserve sync code/schema unless a separately approved migration removes it; redesign must work independently.
- Never bundle provider secrets in app code, storage or EXPO_PUBLIC_* variables. AI requests must go through an authenticated server-side gateway/Edge Function. If the current direct provider client remains on main, treat that as a P0 release blocker, not a styling task.

## 7. Truth, errors and user repair

Worst cases: wrong AI parse silently saved, local-data loss, and coach misjudging the user. Build recoverability into normal flows:
- Save success is shown only after SQLite writes succeed. On failure, retain draft and offer retry.
- Parse failure retains raw input and opens manual editing.
- Edit by tapping any logged row; offer quick Undo; bulk actions are limited to obvious delete-meal/day workflows.
- DB/migration errors must explain recovery/export rather than leaving a spinner indefinitely.
- Distinguish network, rate limit, authentication and provider configuration errors.
- Cloud/sync errors must not block local logging or interrupt routine v1 usage.

## 8. Motivation and metrics

Behaviors to reinforce: same-day food logging, hitting protein, training 3–5 times/week as configured, optional weekly weigh-in. No XP/levels; actual PR markers only. Notifications off by default. Missing days are forgiven, tracked as gaps, and never punished.

Success targets:
- ≥2 food logs on 5+ days/week.
- Median meal logging time under 10 seconds.
- ≥80% of planned workouts logged.
- Still using the app on day 30.
- Voice is reachable in ≤2 taps; set entry stays in context.
- Corrections/manual fallback happen without lost data.

Reddit discussion provides directional UX evidence only: users report logging fatigue, incomplete home-cooked/Indian food data and anxiety around rigid goal language. It supports easier repeats, editable estimates and non-guilty empty/return states—not a claim about every user.
- r/Fitness_India: https://www.reddit.com/r/Fitness_India/comments/1rvq3ln/what_do_youll_think_is_the_best_way_to_reduce/
- r/LoseitApp: https://www.reddit.com/r/LoseitApp/comments/1wfo39z/does_anyone_else_barely_want_to_log_anything/
- r/loseit: https://www.reddit.com/r/loseit/comments/1s7zuz9/stress_related_to_calorie_tracking_apps/
- Bevel navigation feedback: https://www.reddit.com/r/Cirqa/comments/1vlke0j/bevel_app/

## 9. Delivery sequence

### Phase 0 — stable baseline
1. Branch from current main; do not merge overlapping open PRs wholesale.
2. Capture baseline Android screenshots for Today, Quick Log/confirmation, active workout, Nutrition, Progress, Coach, More and empty/error states.
3. Inventory stores, queries, routes, token imports and local persistence before code changes.
4. Run npx tsc --noEmit, npm test -- --runInBand, and npx expo-doctor if configured. Save baseline output.

### Phase 1 — correctness and safety
1. Centralize user-facing day keys and labels; add tests for 03:59 vs 04:00 IST rollover, midnight, month/year boundaries and timezone offset.
2. Ensure every food flow returns an editable draft and converges on explicit confirmation.
3. Verify authenticated server-side AI gateway, remove client-provider-key paths and misleading key setup UI.
4. Verify edit/delete/undo/CSV/JSON against actual SQLite source records.

### Phase 2 — tokens and navigation
1. Canonicalize design-system/tokens.ts and retire conflicting legacy token instructions.
2. Extend existing components before adding new ones.
3. Move to five primary destinations; make More reachable from profile/settings; test Android back and route restoration.

### Phase 3 — core screens
1. Today + Quick Log as the golden path.
2. Nutrition + food review/edit/undo.
3. Train set entry + completion/PR.
4. Progress + missing-data states.
5. Coach, More/settings and onboarding.
6. Network/permission/error/return-after-gap states.

### Phase 4 — device and release
Run tests again; inspect all five destinations for runtime errors/missing tokens. Test a real mid-range Android for one-handed use, keyboard/safe areas, denied mic permission, network loss, 04:00 rollover, backgrounded rest timer and persistence after restart. Remote EAS build failures due exhausted quota are reported separately from source/tests. HTML approval is not device acceptance.

## 10. Definition of done

- [ ] Five primary destinations use one token/component set; More/settings stays reachable.
- [ ] Quick Log is available from all primary destinations; voice opens in ≤2 taps.
- [ ] “2 roti, dal, curd” and a mixed-language equivalent yield editable drafts; nothing saves before confirmation.
- [ ] Manual meal logging and workout entry work without network.
- [ ] Active workout has in-context set entry, one-tap repeat-last-set prefill and a correct rest timer.
- [ ] Missing, unknown, estimated, self-reported and measured data are not conflated.
- [ ] 04:00 IST rollover and local dates have automated regression tests.
- [ ] Save/edit/delete/undo/export/backup are verified against SQLite records.
- [ ] Coach is read-only, concise and evidence-bounded.
- [ ] Empty/loading/error/no-network/permission-denied/return-after-gap states exist.
- [ ] TypeScript/tests/diagnostics pass; EAS quota status is a separate release note.
- [ ] Tested on a real mid-range Android, not only web/HTML.

## 11. Owner decisions still needed (don't invent)

1. What exactly you love about Bevel/Pinterest-style design (typography, whitespace, charts, card treatment, transitions). Current mockup is a proposed direction.
2. Which screen you open most and the last exact moment NutriLift annoyed you.
3. Why previous branches felt wrong to you. Repo evidence shows overlapping PRs and missing merge/device validation, but not your personal reason for abandoning them.
4. Native screenshots of current Today, Quick Log, active workout, Progress, Coach, onboarding and empty/error states for a later visual QA pass.

Proceed with the defaults elsewhere. Subjective uncertainty must not block the core implementation.