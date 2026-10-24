# NutriLift UX 2.0 — Implementation Plan

## Purpose

Transform NutriLift from a collection of nutrition, training, progress, recovery, and coaching screens into a coherent **Personal Nutrition & Training Intelligence System**.

The implementation is not a cosmetic redesign. The objective is to rebuild the interaction model so that:

- context survives navigation,
- every primary action has a clear consequence,
- food logging becomes dramatically faster,
- onboarding creates value instead of presenting a form,
- Today answers "what should I do next?",
- Coach interprets actual user state,
- motion explains state/relationship/hierarchy rather than decorating screens,
- the Samsung A52 remains a real performance baseline,
- accessibility and interruption resilience are first-class,
- and the system becomes increasingly useful as it learns from repeated behavior.

The source motion guidance should be treated as a hard design principle:

> Use motion to explain state, relationship, and hierarchy, or to create one authored moment the surface has earned. Decoration without purpose is animation debt.

The broader critique framework also emphasizes progressive disclosure, low cognitive load, clear status, consistency, recovery, recognition over recall, and explicit persona/edge-case testing.

---

# 1. Product-Level Goal

Move NutriLift from:

> "A collection of nutrition, training, progress and coaching screens."

to:

> "A personal fitness/nutrition operating loop that continuously tells me what happened, what matters, and what I should do next."

The core product loop becomes:

```text
INTENT
  ↓
UNDERSTAND
  ↓
LOG
  ↓
PARSE
  ↓
CONFIRM
  ↓
UPDATE
  ↓
INTERPRET
  ↓
NEXT BEST ACTION
  ↓
REPEAT
```

## Core principle

**Context must survive every transition.**

Examples:

- Breakfast → Log Breakfast
- Lunch → Log Lunch
- Next Up → Log the suggested item
- Global + → Quick Log
- Voice → Voice logging state
- Coach → Action with the correct context

Internally, these can share components. UX-wise, they must feel intentional rather than generic.

---

# 2. UX Architecture

## Primary navigation

```text
TODAY
 ├── Daily targets
 ├── Current progress
 ├── Next Best Action
 ├── Meals
 └── Training

TRAIN
 ├── Today's workout
 ├── Exercise execution
 ├── Set logging
 ├── Rest state
 └── Completion

PROGRESS
 ├── Nutrition
 ├── Training
 ├── Recovery
 └── Trends

COACH
 ├── Context-aware recommendations
 ├── Suggested questions
 └── Free-form chat

MORE
 ├── Profile
 ├── Body
 ├── Supplements
 ├── Recovery
 ├── Reports
 ├── Account
 └── Settings
```

Do not add another primary tab unless a future research cycle proves the existing IA cannot carry the new capability.

---

# 3. Shared State Architecture

Before rebuilding screens, establish a consistent domain and interaction state model.

## Core entities

```ts
MealContext
WorkoutContext
RecoveryContext
ProfileState
NutritionTarget
FoodLog
VoiceSession
QuickLogAction
CoachInsight
NextAction
```

## Meal context

```ts
type MealType =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner";

interface MealContext {
  mealType: MealType;
  date: string;
  startedFrom:
    | "today-card"
    | "next-up"
    | "quick-log"
    | "recent"
    | "coach";
}
```

The logger should always know what the user is logging and why they arrived there.

---

# 4. Unified Food Logging Engine

The logger should be one underlying system with multiple context-aware entry points.

## User-facing hierarchy

```text
What did you have?

[ Search food ]

Quick add
[ Eggs ] [ Roti ] [ Banana ] [ Whey ]

Your usuals
[ Usual breakfast ]

────────────

Or use

[ Voice ]
[ Camera ]
[ Describe ]
```

The system should not force users to choose between internal product capabilities before they have expressed their intent.

## Principle

**Users have an intent. They do not care which subsystem is being invoked.**

---

# 5. Food Logger State Machine

```text
IDLE
 ↓
INPUT_MODE
 ↓
PROCESSING
 ↓
PARSED
 ↓
REVIEW
 ↓
CONFIRMED
 ↓
SAVED
```

Failure branches:

```text
INPUT_MODE
 ↓
PERMISSION_REQUIRED
 ↓
FAILED
 ↓
RECOVER / CHANGE METHOD
```

```text
PARSED
 ↓
LOW_CONFIDENCE
 ↓
USER_CORRECTION
 ↓
REVIEW
```

Every major async workflow should have:

```text
idle
loading
success
error
```

No silent failures.

---

# 6. Voice Logging

Voice must behave like a real stateful interaction.

## Permission

```text
Use your voice to log meals faster.

[ Allow microphone ]
[ Use another method ]
```

## Ready

```text
VOICE LOG

Tap to start

      🎙

Say what you ate.
```

## Recording

```text
LISTENING…

      🎙
    ● ● ● ●

"3 eggs and two rotis"
```

## Processing

```text
Understanding your meal…
```

## Result

```text
I heard:

✓ 3 eggs
✓ 2 rotis
✓ 1 bowl dal

[ Add to Breakfast ]
[ Edit ]
[ Try again ]
```

## Saved

```text
Breakfast logged ✓

+420 kcal
+28g protein
```

### Failure cases

- microphone permission denied,
- microphone unavailable,
- speech recognition failure,
- timeout,
- network unavailable,
- unintelligible input,
- user cancels,
- user leaves mid-recording.

Each should have a recoverable path.

---

# 7. Motion Thesis

## Focal moment

**Meal logging → confirmation → Today's nutrition state updating.**

This is the single sequence that deserves authored motion.

```text
Meal confirmation
      ↓
Meal card compresses into Today
      ↓
Calories/protein counters update
      ↓
Next Best Action recalculates
```

The motion should communicate:

> "Your action changed your day."

Not:

> "Cards slide in because cards exist."

## Supporting motion

Motion is allowed when it:

- acknowledges an action,
- explains a state change,
- preserves continuity,
- establishes hierarchy,
- directs attention at a meaningful moment,
- embodies the product's visual world.

Delete motion that does none of these.

---

# 8. Motion Timing System

| Duration | Typical use |
|---|---|
| 100–150 ms | Immediate feedback |
| 150–300 ms | Routine state change |
| 300–500 ms | Layout/overlay/view transition |
| 500–800 ms | Authored focal sequence |

Use confident deceleration:

```css
cubic-bezier(0.16, 1, 0.3, 1)
```

Rules:

- exits faster than entrances,
- no default bounce/elastic curves,
- no animation should create perceived latency,
- do not repeat cinematic choreography across routine screens.

---

# 9. Motion Implementation

Use the existing stack before introducing a dependency.

### CSS

Use for:

- button states,
- selection,
- opacity,
- simple transform,
- bounded enter/exit.

### Web Animations API / existing motion library

Use for:

- interruption,
- sequencing,
- dynamic values,
- the focal meal-confirmation sequence.

### View Transitions / shared-element techniques

Use only where continuity between states is the point.

### Scroll-driven motion

Only when the scrolling relationship itself conveys meaning, with a robust fallback.

Avoid animating layout-driving properties such as:

```text
width
height
top
left
margin
```

Prefer transforms, opacity, FLIP, or grid techniques.

---

# 10. Reduced Motion

Every web animation needs an intentional `prefers-reduced-motion` path.

Reduced motion should:

- reduce spatial travel,
- remove unnecessary loops,
- preserve meaningful state changes,
- preserve success/error acknowledgement,
- never hide content by default.

Example:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
```

The implementation must still provide visible confirmation.

---

# 11. Today Redesign

Today becomes the command center.

## Proposed structure

```text
GOOD EVENING

Today's nutrition
1,480 / 2,350 kcal
92 / 145g protein

─────────────────

NEXT BEST ACTION

You're 53g short on protein.

Quick win:
Whey + banana

[ Log it ]

─────────────────

MEALS

Breakfast      ✓
Lunch          ✓
Snack          +
Dinner         +

─────────────────

TRAINING

Push B
1 / 5 exercises

[ Continue workout ]

─────────────────

RECOVERY

Sleep
6h 40m

[ Log recovery ]
```

The screen should answer:

> What has happened?
> What matters?
> What should I do now?

---

# 12. Next Best Action Engine

Replace a static "Next Up" card with a contextual decision engine.

## Inputs

```text
meal state
time
nutrition deficit
protein deficit
training state
recovery state
planned meals
user history
goal
user preferences
```

## Output

```ts
interface NextAction {
  type:
    | "log-meal"
    | "complete-workout"
    | "log-recovery"
    | "eat-protein"
    | "review-target";
  priority: number;
  reason: string;
  actionLabel: string;
}
```

The engine should produce a single highest-value action at a time, not a wall of recommendations.

---

# 13. Global `+` Redesign

The central `+` becomes the universal action launcher.

```text
QUICK LOG

🍽 Food
🏋️ Workout
⚖ Weight
💧 Water
😴 Recovery
```

Maximum 5 high-level choices.

Food then branches into:

```text
Search
Voice
Camera
Recent
```

The global `+` should no longer automatically open the generic food logger.

---

# 14. Onboarding / Profile Redesign

The current manual target-entry model should be replaced by a guided setup flow.

## Step 1 — Goal

```text
What's your goal?

🔥 Lose fat
💪 Build muscle
⚖ Maintain
🏃 Improve performance
```

## Step 2 — Body

```text
Age
Height
Weight
```

## Step 3 — Activity

```text
Mostly sitting
Lightly active
Active
Very active
```

## Step 4 — Food approach

```text
Vegetarian
Non-veg
Vegan
Flexible
```

## Step 5 — Preferences

```text
Indian
South Indian
High protein
Other preferences
```

## Result

```text
YOUR TARGETS ARE READY

2,350 kcal

145g protein
260g carbs
70g fat
```

Targets become calculated state.

Manual overrides belong under an Advanced/Customize area.

---

# 15. Onboarding Motion

Motion should communicate progression:

```text
1/5 → 2/5 → 3/5 → 4/5 → 5/5
```

Use directional continuity where useful.

Target duration:

```text
250–350ms
```

No repeated cinematic entrance animations on every field.

---

# 16. Progress Redesign

Progress should answer:

> How am I actually doing?

## Tabs

```text
Nutrition
Training
Recovery
Body
```

## Empty state

```text
YOUR FIRST WEEK STARTS TODAY

Once you log meals, workouts and recovery,
NutriLift will start identifying patterns.

[ Log first meal ]
```

## Populated state

```text
WEEKLY

Protein average
127g / 145g

████████░░

Training
4 / 5 sessions

Recovery
7.2 / 10

INSIGHT

Protein is consistently lower
on rest days.

[ Ask Coach ]
```

Progress should interpret data, not merely render charts.

---

# 17. Coach Redesign

Coach becomes a reasoning layer over NutriLift's actual state.

```text
NUTRILIFT COACH

Today you:
• trained Push B
• are 53g short on protein
• slept 6h 40m

I'd prioritize protein tonight.

[ What should I eat? ]
[ Why am I below target? ]
[ Show me a quick meal ]
```

Coach inputs should include:

- nutrition state,
- training state,
- recovery,
- goals,
- recent behavior,
- trends,
- user preferences.

The product should feel like it remembers context.

---

# 18. Recovery Redesign

Current 1–5 rating controls should clearly represent one selected value.

```text
Sleep quality

1    2    [3]    4    5
```

Then:

```text
3 / 5
Okay

Energy
4 / 5
Good

Soreness
2 / 5
Mild

Stress
3 / 5
Moderate
```

After save:

```text
Recovery logged ✓
```

Then Today and Coach can consume the result.

---

# 19. Supplements Redesign

Current empty screen should become actionable.

```text
SUPPLEMENTS

Today's checklist

○ Vitamin D
○ Omega-3
○ Magnesium
○ Zinc

[ + Add supplement ]
```

Completed:

```text
✓ Vitamin D
✓ Omega-3
○ Magnesium
○ Zinc

2 / 4 completed
```

No animation loops; only small state confirmation.

---

# 20. Account Redesign

Replace the visible password-first flow with simpler authentication options.

```text
ACCOUNT

Continue with Google
Continue with Apple

────────────

Continue with email
```

Make sync state explicit:

```text
NutriLift Sync

✓ Local data
✓ Cloud sync

Last synced: 2 min ago
```

The user should always understand where their data lives and whether sync succeeded.

---

# 21. Error-State System

Every important operation needs:

```text
idle
loading
success
error
```

Example:

```text
Parsing your meal…
```

then:

```text
Done ✓
```

or:

```text
I couldn't confidently identify that meal.

[ Try again ]
[ Search manually ]
```

Avoid vague:

> Something went wrong.

Errors should identify the problem and offer a recovery action.

---

# 22. Shared Component System

Create reusable primitives:

```text
<AsyncState />
<SuccessFeedback />
<ErrorState />
<EmptyState />
<BottomSheet />
<ContextHeader />
<ProgressBar />
<ConfidenceBadge />
<QuickAction />
<NextBestAction />
<VoiceRecorder />
<MealReview />
```

The goal is to stop every screen from inventing its own interaction patterns.

---

# 23. Performance Baseline

Target device:

**Samsung A52**

Secondary:

- Samsung A55
- ~360px viewport
- ~390px viewport
- desktop Chrome

## Interaction targets

```text
Tap feedback:       <150ms
Routine transition:  150–300ms
Overlay transition: <350ms
```

## Runtime goal

Target ~60fps under normal interaction.

Do not assume transforms are always free; measure on real target hardware.

Avoid:

- continuously animated full-page blur,
- multiple simultaneous animated shadows,
- large filter animations,
- unnecessary canvas/shader effects,
- full-screen backdrop effects,
- persistent animation loops.

Use `will-change` only during known animations.

---

# 24. Screen-by-Screen Motion Budget

| Screen | Motion budget |
|---|---|
| Today | Medium |
| Food logging | Medium |
| Voice | Medium |
| Training | Low–medium |
| Progress | Low |
| Coach | Low |
| Profile | Low |
| Recovery | Low |
| Supplements | Low |
| Settings | Very low |

The focal moment is:

**Meal confirmation → Today update.**

Everything else must earn its animation.

---

# 25. Mobile UX

The A52 is a real product constraint.

Prioritize:

- thumb-zone actions,
- bottom navigation,
- one-handed operation,
- 44×44pt minimum touch targets,
- preferably 48×48px for high-frequency actions,
- interruption-safe state,
- minimal typing.

Important actions should not depend on a difficult top-of-screen reach.

---

# 26. Interruption Resilience

Test every long interaction against:

```text
start → leave → return
start → refresh → return
start → browser background → return
start → network interruption → return
```

Expected:

- drafts preserved,
- context preserved,
- no duplicate submissions,
- no lost meal,
- no broken navigation.

Examples:

```text
Onboarding step 3/5
→ refresh
→ return to step 3/5
```

```text
Voice recording
→ interruption
→ safely preserve transcript where possible
```

---

# 27. Personalization Through Repetition

Create data entities:

```text
recent_foods
favorite_foods
frequent_meals
meal_templates
food_corrections
ai_parse_results
```

Behavior should improve over time.

Example:

After repeated logging:

```text
Your usual breakfast

4 eggs + 2 rotis + banana
```

The app becomes faster because it learns.

---

# 28. AI Confidence

Parsed food should carry:

```ts
confidence: number;
source:
  | "manual"
  | "search"
  | "voice"
  | "vision"
  | "template";
```

Low confidence should trigger a targeted clarification rather than silently committing uncertain data.

Example:

```text
Dal
1 bowl

About this confident
[ Confirm ]
[ Change ]
```

---

# 29. Intelligence Architecture

The eventual flow:

```text
Food
Training
Recovery
Goals
History
   ↓
State Aggregator
   ↓
Insight Engine
   ↓
Next Best Action
   ↓
Today / Coach
```

The UI should present the conclusion, not expose every internal rule.

---

# 30. Implementation Phases

## Phase 0 — UX Foundation

Build:

- domain/state model,
- design tokens,
- navigation contract,
- modal/sheet system,
- shared feedback states,
- motion tokens,
- reduced-motion tokens.

Deliverable:

**UX 2.0 component/state specification.**

---

## Phase 1 — Food Logging

Build:

- contextual meal logging,
- search,
- quick add,
- recent foods,
- usual meals,
- voice state machine,
- AI parse,
- review,
- confirmation,
- errors,
- recovery.

Acceptance:

> Breakfast/Lunch/Snack/Dinner/Next Up/+ all lead into the correct contextual state.

---

## Phase 2 — Onboarding

Build:

- 5-step flow,
- progress indicator,
- automatic target calculation,
- goals,
- activity,
- diet,
- preferences,
- advanced target overrides.

Acceptance:

> A new user reaches personalized targets without manually calculating calorie/macro targets.

---

## Phase 3 — Today Intelligence

Build:

- daily target progress,
- Next Best Action,
- meal state,
- training state,
- recovery state,
- contextual recommendations.

Acceptance:

> Opening Today answers "What should I do next?" within ~5 seconds.

---

## Phase 4 — Training Integration

Build:

- Today → Train continuity,
- exercise execution,
- set logging,
- rest state,
- completion,
- post-workout nutrition context.

Acceptance:

> Completing training changes Today's state.

---

## Phase 5 — Progress + Coach

Build:

- nutrition trends,
- training trends,
- recovery trends,
- weekly insights,
- context-aware Coach,
- suggested prompts.

Acceptance:

> Coach visibly uses the user's actual NutriLift state.

---

## Phase 6 — Secondary Surfaces

Build:

- Recovery,
- Supplements,
- Body,
- Account,
- Reports,
- Settings.

All should consume the shared component system.

---

## Phase 7 — Motion Pass

Implement:

- meal confirmation focal sequence,
- sheet transitions,
- selection states,
- success/error feedback,
- onboarding progression,
- voice states.

Audit every animation:

> What meaning disappears if this is removed?

If the answer is "none", remove it.

---

## Phase 8 — Performance Pass

Test:

- Samsung A52,
- Samsung A55,
- 360px viewport,
- 390px viewport,
- desktop,
- reduced motion,
- slow network,
- interrupted workflows,
- offline/reconnect scenarios.

Measure:

- frame rate,
- input latency,
- long tasks,
- layout shifts,
- JS work,
- memory,
- navigation performance,
- initial load.

---

## Phase 9 — Real-World UX Testing

### Day 1

- new user,
- profile,
- first meal,
- first workout,
- first recovery log.

### Day 7

- repeat meals,
- recent foods,
- progress,
- Coach,
- missed meal,
- missed workout.

### Day 30

- trend interpretation,
- target adaptation,
- habit recognition,
- Coach usefulness,
- behavior change.

### Day 90

- personalization quality,
- longitudinal insights,
- target stability/adaptation,
- retention-driving features,
- data trust.

---

# 31. Definition of Done

A feature is not finished when its page exists.

## UX

- context preserved,
- primary action obvious,
- loading/empty/success/error states exist,
- recovery exists,
- unnecessary decisions removed.

## Motion

- explains something,
- fast enough for routine use,
- exits faster than entrances,
- reduced-motion path exists,
- repeated use remains calm,
- no decorative animation debt.

## Performance

- smooth on A52,
- expensive effects bounded,
- no persistent animation loops,
- no obvious layout thrashing,
- animation never blocks interaction.

## Accessibility

- keyboard navigation,
- focus management,
- screen-reader semantics,
- adequate touch targets,
- reduced-motion support.

## Product intelligence

- food feeds Today,
- training feeds Today,
- recovery feeds Today,
- Today feeds Coach,
- Coach feeds Next Best Action.

---

# 32. Recommended Implementation Order

```text
1. Shared state architecture
        ↓
2. Contextual food logger
        ↓
3. Voice state machine
        ↓
4. Meal confirmation/update loop
        ↓
5. Onboarding + automatic targets
        ↓
6. Today + Next Best Action
        ↓
7. Training ↔ nutrition integration
        ↓
8. Progress
        ↓
9. Coach intelligence
        ↓
10. Recovery / Supplements / More
        ↓
11. Motion system
        ↓
12. Accessibility
        ↓
13. A52 performance pass
        ↓
14. 30/90-day scenario testing
        ↓
15. Final polish
```

---

# 33. Brutal Assessment of This Plan

## Current implementation-plan score: 8.4/10

This is **strong**, but it is not yet a genuinely top-tier execution specification.

It is good enough to direct a redesign.

It is not yet good enough to guarantee that a team will build the same product interpretation without making dozens of architectural decisions during implementation.

## Why it is not 9.5–10/10 yet

### 1. It is still more UX strategy than engineering execution

We define *what* should happen very well.

We do not yet define every:

- API contract,
- database mutation,
- event,
- state transition,
- cache behavior,
- optimistic update,
- rollback,
- persistence strategy,
- synchronization rule.

That matters because NutriLift is becoming a stateful intelligence system.

---

### 2. There is no formal event taxonomy

We need a canonical event model:

```text
meal.log.started
meal.input.voice_started
meal.input.voice_completed
meal.ai_parse.completed
meal.review.confirmed
meal.saved
meal.corrected
next_action.generated
coach.recommendation.accepted
workout.started
workout.completed
recovery.logged
```

Without this, analytics and intelligence will become messy.

---

### 3. There is no explicit data contract between modules

We say:

> Training feeds Today.

But the implementation needs to define exactly:

```text
Training → which fields?
Recovery → which fields?
Food → which fields?
Coach → which context window?
```

Otherwise each feature will invent its own representation.

---

### 4. The AI layer needs an evaluation framework

This is a major missing piece.

For voice/vision/food parsing:

```text
accuracy
confidence calibration
portion estimation
correction rate
false positive rate
false logging rate
latency
fallback rate
```

The system should be measurable, not merely "AI-powered."

---

### 5. There is no experiment framework

Some UX questions should be experimentally resolved.

Examples:

```text
Global + → Quick Log
vs
Global + → Food

AI review
vs
Auto-save high-confidence meals

Next Best Action
vs
simple Next Up

5-step onboarding
vs
3-step onboarding
```

These should be instrumented for:

- completion,
- time-to-value,
- logging frequency,
- abandonment,
- correction rate,
- 7/30-day retention.

---

### 6. There is no explicit trust model

Nutrition is a domain where users may act on incorrect information.

NutriLift needs:

```text
confidence
source
estimated vs verified
AI-generated vs user-entered
correction history
```

The UI shouldn't pretend that an AI estimate is a measured fact.

---

### 7. There is no explicit observability layer

Need:

```text
error tracking
performance telemetry
AI latency
API latency
failed food parses
voice failure rate
sync failure
offline queue failures
```

Without observability, the team will discover problems through users rather than telemetry.

---

### 8. Security/privacy is missing

Especially because the product can eventually contain:

- body information,
- food history,
- training data,
- recovery data,
- behavioral history,
- AI conversations.

The implementation plan needs explicit rules for:

```text
data minimization
authentication
authorization
local storage
encrypted transport
AI provider data handling
account deletion
data export
sync conflict handling
```

---

# 34. How to Take This From 8.4 → 10+

The next level is not adding more screens.

It is adding a **system behind the UX**.

## Level 1 — 8.4/10

What this plan already has:

```text
UX architecture
Interaction model
Motion system
Performance
Accessibility
Real-world QA
```

## Level 2 — 9.0/10

Add:

```text
Domain state machines
API contracts
Event taxonomy
Analytics taxonomy
Error taxonomy
Offline/sync rules
AI confidence model
```

## Level 3 — 9.5/10

Add:

```text
Experiment framework
AI evaluation harness
Performance telemetry
Product metrics
Feature flags
Rollout strategy
Data lineage
Trust/explainability model
```

## Level 4 — 10+/10

Build:

```text
Personal Intelligence Loop

Intent
 ↓
Observation
 ↓
Evidence
 ↓
Evaluation
 ↓
Recommendation
 ↓
Action
 ↓
Outcome
 ↓
Learning
 ↓
Adaptation
```

Then make the UI a **projection of that system**.

At that point NutriLift stops being:

> a calorie tracker + workout tracker + chatbot.

It becomes:

> **a continuously adapting personal fitness/nutrition intelligence system.**

---

# 35. The 10/10 Architecture

The next iteration should introduce these layers:

```text
┌──────────────────────────────────────────┐
│                 UI LAYER                 │
│ Today / Train / Progress / Coach / More │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│             EXPERIENCE LAYER             │
│ Context / Navigation / Motion / States   │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│            INTELLIGENCE LAYER            │
│ Insights / Next Action / Coach / Adapt   │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│              DOMAIN LAYER                │
│ Food / Training / Recovery / Body / Goal │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│               DATA LAYER                 │
│ Local / Sync / Events / History / Cache  │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│           OBSERVABILITY LAYER             │
│ Metrics / Errors / AI Eval / Performance │
└──────────────────────────────────────────┘
```

That is the architecture I would aim for before calling NutriLift a genuinely mature product.

---

# 36. Required Next-Level Workstreams

Add these workstreams to the implementation backlog:

## W1 — Interaction State Machine

Formalize every major UI state and transition.

## W2 — Domain & API Contracts

Define exactly what each module reads/writes.

## W3 — Event & Analytics Taxonomy

Instrument every meaningful user action.

## W4 — AI Evaluation System

Measure food parsing, voice, vision, recommendation quality, confidence calibration.

## W5 — Personalization Engine

Recent → frequent → usual → predicted.

## W6 — Next Best Action Engine

Rank possible actions based on state and user goals.

## W7 — Trust / Explainability

Explain estimates and recommendations without overwhelming the user.

## W8 — Offline / Sync Engine

Local-first behavior, queues, retries, conflict resolution.

## W9 — Performance Telemetry

A52-specific real-device monitoring.

## W10 — Experiment Platform

A/B testing and gradual rollout.

## W11 — Reliability / Observability

Error tracking, API monitoring, AI failures, sync failures.

## W12 — Privacy / Security

Authentication, data retention, deletion, export, provider boundaries.

## W13 — Scenario Automation

30/90-day simulated users and end-to-end scenario suites.

## W14 — UX Quality Gates

A reusable gate for:

- accessibility,
- performance,
- state completeness,
- motion,
- error recovery,
- mobile usability.

---

# 37. Final Brutal Verdict

**Current visual/product concept:** ~7.5–8/10  
**Current UX redesign direction:** ~8.5/10  
**Current implementation plan:** **8.4/10**  
**Production execution readiness:** ~7/10  
**Potential after the missing system layers are added:** **10/10+**

The biggest danger now is **overbuilding screens instead of building the intelligence/state system behind them**.

Do not spend the next sprint adding 20 beautiful screens.

Spend it making this loop airtight:

```text
USER DOES SOMETHING
        ↓
NUTRILIFT UNDERSTANDS IT
        ↓
STATE CHANGES
        ↓
USER SEES THE CONSEQUENCE
        ↓
NUTRILIFT LEARNS
        ↓
NEXT ACTION GETS BETTER
```

That is the real "next level."

---

# 38. Final Quality Bar

Do not call UX 2.0 finished until a new user can:

```text
Open NutriLift
    ↓
Understand what to do
    ↓
Complete onboarding
    ↓
Log first meal in <30–45 sec
    ↓
See nutrition state update
    ↓
Get a meaningful next action
    ↓
Log workout
    ↓
Log recovery
    ↓
Ask Coach
    ↓
Receive context-aware response
    ↓
Return a week later
    ↓
See NutriLift understand their pattern
```

And every one of those flows must survive:

```text
slow network
refresh
backgrounding
permission denial
AI failure
voice failure
empty data
incorrect input
rapid tapping
keyboard navigation
reduced motion
A52 hardware
```

Only then is NutriLift moving from **"good fitness app"** toward **"personal intelligence product."**


---

# 39. NEXT LEVEL — 10+/10 EXECUTION BLUEPRINT

The previous plan defines the product and UX direction. This section turns it into an **implementation-grade operating system**.

The target is no longer simply:

> "Build the redesigned screens."

The target becomes:

> **Build a reliable, measurable, explainable, adaptive system whose UI is a projection of a well-defined state model.**

This is the difference between a polished app and a product that can keep getting better.

---

# 40. Architecture Principle

NutriLift should be built around five contracts:

```text
USER INTENT
    ↓
DOMAIN STATE
    ↓
EVIDENCE / EVENTS
    ↓
INTELLIGENCE
    ↓
EXPERIENCE
```

The UI must never become the source of truth for business logic.

Instead:

```text
User action
   ↓
Command
   ↓
Domain mutation
   ↓
Event
   ↓
State update
   ↓
Derived insight
   ↓
UI projection
```

This gives the application a deterministic backbone.

---

# 41. System Architecture

```text
┌──────────────────────────────────────────────────────┐
│                      EXPERIENCE                      │
│ Today / Train / Progress / Coach / More             │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                    EXPERIENCE STATE                  │
│ Context / Navigation / UI state / Motion / Drafts   │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                      DOMAIN CORE                      │
│ Food / Training / Recovery / Body / Goals / Plans   │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                    EVENT & EVIDENCE                   │
│ Immutable events / corrections / provenance         │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                   INTELLIGENCE CORE                   │
│ Rules / insights / ranking / personalization / AI   │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                    PERSISTENCE                        │
│ Local store / server / sync / cache / queues        │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                   OBSERVABILITY                       │
│ Metrics / logs / traces / AI eval / performance     │
└──────────────────────────────────────────────────────┘
```

### Rule

No feature should directly reach across layers because it is convenient.

For example:

```text
Coach UI
  ✗ directly mutates meal database

Coach UI
  ✓ dispatches recommendation action
      ↓
  domain command
      ↓
  mutation
      ↓
  event
      ↓
  insight refresh
```

---

# 42. Canonical Domain Model

Define the core objects once.

## User

```ts
interface User {
  id: string;
  profile: Profile;
  goals: Goal[];
  preferences: Preferences;
  settings: UserSettings;
}
```

## Profile

```ts
interface Profile {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  biologicalSex?: "male" | "female" | "other";
  activityLevel?: ActivityLevel;
}
```

## Goal

```ts
interface Goal {
  id: string;
  type:
    | "fat-loss"
    | "muscle-gain"
    | "maintenance"
    | "performance";
  priority: number;
  target?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
}
```

## Nutrition target

```ts
interface NutritionTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source:
    | "calculated"
    | "user-adjusted"
    | "coach-adjusted";
  confidence?: number;
  effectiveFrom: string;
}
```

## Meal log

```ts
interface MealLog {
  id: string;
  mealType: MealType;
  timestamp: string;
  foods: FoodItem[];
  totals: NutritionTotals;
  source: LogSource;
  confidence?: number;
  status: "draft" | "confirmed" | "corrected";
}
```

## Food item

```ts
interface FoodItem {
  id: string;
  canonicalFoodId?: string;
  name: string;
  quantity: number;
  unit: string;
  nutrition: NutritionTotals;
  confidence: number;
  source:
    | "manual"
    | "search"
    | "voice"
    | "vision"
    | "template"
    | "import";
}
```

## Workout

```ts
interface WorkoutSession {
  id: string;
  planId?: string;
  dayType: string;
  startedAt?: string;
  completedAt?: string;
  exercises: ExerciseLog[];
  status: "planned" | "active" | "completed" | "abandoned";
}
```

## Recovery log

```ts
interface RecoveryLog {
  id: string;
  date: string;
  sleepHours: number;
  sleepQuality: number;
  energy: number;
  soreness: number;
  stress: number;
  notes?: string;
}
```

---

# 43. Commands vs Events

This distinction is critical.

## Commands

Commands express what the user wants done:

```text
StartMealLog
AddFood
ParseMeal
ConfirmMeal
CorrectFood
StartWorkout
LogSet
FinishWorkout
LogRecovery
UpdateProfile
GenerateCoachAnswer
```

## Events

Events express what happened:

```text
meal.log.started
food.added
meal.parse.completed
meal.confirmed
meal.corrected
workout.started
set.logged
workout.completed
recovery.logged
profile.updated
coach.answer.generated
```

Commands may fail.

Events represent committed facts.

---

# 44. Canonical Event Taxonomy

Create a versioned event schema.

## Food

```text
food.log.started
food.input.selected
food.search.completed
food.voice.started
food.voice.completed
food.vision.started
food.vision.completed
food.ai_parse.started
food.ai_parse.completed
food.ai_parse.failed
food.review.started
food.review.confirmed
food.corrected
food.deleted
meal.saved
meal.duplicated_prevented
```

## Training

```text
workout.viewed
workout.started
exercise.started
set.logged
rest.started
rest.completed
workout.completed
workout.abandoned
```

## Recovery

```text
recovery.opened
recovery.saved
recovery.edited
```

## Coach

```text
coach.opened
coach.prompt.selected
coach.question.sent
coach.answer.generated
coach.recommendation.shown
coach.recommendation.accepted
coach.recommendation.dismissed
```

## Onboarding

```text
onboarding.started
onboarding.step_viewed
onboarding.step_completed
onboarding.abandoned
onboarding.completed
target.generated
target.adjusted
```

## System

```text
sync.started
sync.completed
sync.failed
offline.entered
offline.recovered
permission.requested
permission.granted
permission.denied
```

Every event should include:

```ts
interface AppEvent<T = unknown> {
  id: string;
  name: string;
  version: number;
  userId?: string;
  sessionId: string;
  timestamp: string;
  source: "user" | "system" | "ai" | "sync";
  payload: T;
}
```

---

# 45. Provenance and Trust

Every important value needs provenance.

Instead of:

```json
{
  "protein": 31
}
```

store enough metadata to answer:

> Where did this number come from?

Example:

```json
{
  "protein": 31,
  "source": "ai-estimate",
  "confidence": 0.82,
  "foodSource": "voice",
  "confirmedByUser": false
}
```

This becomes essential for:

- AI food parsing,
- portion estimates,
- recommendations,
- target adjustments,
- Coach explanations.

---

# 46. Trust Levels

Create a simple internal trust hierarchy:

```text
T0 — user-entered exact
T1 — confirmed search/template
T2 — AI-assisted, user-confirmed
T3 — AI-estimated, unconfirmed
T4 — inferred/recommended
```

The UI should never present T3/T4 as if they were measured facts.

Examples:

```text
145g protein
```

versus:

```text
~145g estimated
```

versus:

```text
Recommended target: 145g
```

These are different semantics.

---

# 47. Food Parsing Pipeline

Implement food intelligence as an explicit pipeline.

```text
RAW INPUT
   ↓
NORMALIZE
   ↓
ENTITY EXTRACTION
   ↓
FOOD MATCHING
   ↓
QUANTITY/PARTITION ESTIMATION
   ↓
NUTRITION LOOKUP
   ↓
CONFIDENCE CALCULATION
   ↓
USER REVIEW
   ↓
COMMIT
```

Each stage should be observable.

The UI should only expose the minimum information needed to correct uncertainty.

---

# 48. AI Evaluation Harness

AI features must have measurable quality.

## Voice

Track:

```text
transcription success
latency
empty transcript rate
retry rate
user correction rate
```

## Food parsing

Track:

```text
food identification accuracy
quantity accuracy
meal-level correction rate
false positive rate
unknown-food rate
confidence calibration
```

## Coach

Track:

```text
response latency
recommendation acceptance
recommendation dismissal
user follow-up
grounding violations
unsupported claims
```

---

# 49. Golden Dataset

Build a versioned evaluation dataset.

Example:

```text
dataset/
  food/
    common_indian_meals.jsonl
    ambiguous_portions.jsonl
    mixed_meals.jsonl
    colloquial_input.jsonl
    multilingual_input.jsonl

  coach/
    nutrition_questions.jsonl
    training_questions.jsonl
    recovery_questions.jsonl
    edge_cases.jsonl
```

Each test case contains:

```json
{
  "input": "...",
  "expected_entities": [],
  "expected_behavior": "...",
  "acceptable_variance": "...",
  "severity": "high"
}
```

Run this dataset before changing the parsing model, prompts, ranking logic, or recommendation engine.

---

# 50. Confidence Calibration

Do not assume:

```text
confidence = correctness
```

Measure calibration.

Example acceptance target:

```text
0.9 confidence
→ should be correct around 90% of the time
```

The precise target should be established from the evaluation set rather than guessed.

If confidence is poorly calibrated, fix the confidence model before exposing confidence to users.

---

# 51. Recommendation Engine

Separate recommendation generation from recommendation ranking.

## Candidate generation

Possible actions:

```text
log breakfast
eat protein
hydrate
complete workout
rest
log recovery
review target
ask coach
```

## Ranking

Score candidates against:

```text
goal relevance
urgency
user preference
time context
current state
recent actions
recovery
confidence
friction
```

Example conceptual score:

```text
priority =
  goal_relevance
+ urgency
+ state_gap
+ timing_fit
+ user_preference
- friction
- uncertainty
```

Do not hardcode arbitrary weights permanently. Make the scoring system observable and tunable.

---

# 52. Next Best Action Contract

```ts
interface NextAction {
  id: string;
  type: ActionType;
  title: string;
  reason: string;
  actionLabel: string;
  priority: number;
  confidence: number;
  expiresAt?: string;
  source:
    | "rule"
    | "model"
    | "coach"
    | "user-plan";
  evidenceIds: string[];
}
```

The `evidenceIds` field is important.

Coach should be able to answer:

> Why are you suggesting this?

---

# 53. Explainability UX

Do not expose model internals.

Use compact explanation:

```text
Why this?

Protein is 42g below today's target
and you're training this evening.
```

Or:

```text
Why this?

You've logged this meal 6 times
after similar workouts.
```

This creates trust without dumping technical details.

---

# 54. Personalization Ladder

NutriLift should progress through these levels.

## Level 0 — Generic

```text
Log breakfast.
```

## Level 1 — Contextual

```text
Breakfast isn't logged yet.
```

## Level 2 — Historical

```text
You usually eat around now.
```

## Level 3 — Personalized

```text
Your usual breakfast is 4 eggs + 2 rotis.
```

## Level 4 — Predictive

```text
You usually train after breakfast.
Want to repeat your usual meal?
```

## Level 5 — Adaptive

```text
You've been consistently below protein
on training days. I adjusted your suggestions.
```

The product should visibly become more useful over time.

---

# 55. Learning Loop

The core intelligence loop:

```text
OBSERVE
  ↓
STORE EVIDENCE
  ↓
EVALUATE
  ↓
GENERATE INSIGHT
  ↓
RECOMMEND
  ↓
USER ACTS
  ↓
OBSERVE OUTCOME
  ↓
UPDATE MODEL/RULE
```

Do not build recommendations as isolated one-off prompts.

---

# 56. Recommendation Outcome Tracking

Every recommendation should have an outcome state:

```text
shown
accepted
started
completed
dismissed
ignored
expired
```

Then calculate:

```text
recommendation acceptance rate
recommendation completion rate
recommendation dismissal rate
time-to-action
```

This creates a feedback loop for the Next Best Action engine.

---

# 57. Offline-First Contract

The app should treat local state as the primary user experience.

## Local queue

```text
pending mutation
   ↓
persist locally
   ↓
optimistic UI
   ↓
sync when possible
```

## Queue states

```text
pending
sending
succeeded
retryable
failed
conflict
```

Never silently discard a user action.

---

# 58. Sync Conflict Strategy

Define conflict rules per entity.

### Meal

Prefer:

```text
append event
```

rather than destructive last-write-wins where possible.

### Profile

Use versioned optimistic concurrency.

### Preferences

Use explicit field-level conflict resolution where practical.

### Derived analytics

Recompute from authoritative source.

Never sync cached analytics as if they were source-of-truth data.

---

# 59. Idempotency

Every mutating action that may be retried needs an idempotency key.

Example:

```text
meal.save
requestId = userId + clientMutationId
```

If network retries the request, the server should not create duplicate meals.

This is especially important for mobile interruptions.

---

# 60. Draft Recovery

Any multi-step interaction should be draft-safe.

Drafts include:

```text
onboarding
meal logging
voice transcripts
coach composition
workout session
recovery form
```

Draft rules:

```text
autosave
restore
expire
clear-on-confirm
```

Do not persist sensitive content longer than necessary.

---

# 61. Analytics Architecture

Do not scatter analytics calls throughout UI components.

Use:

```ts
analytics.track(eventName, payload);
```

behind one abstraction.

The analytics layer should validate event schemas before shipping.

Example:

```ts
analytics.track("meal.review.confirmed", {
  mealId,
  confidence,
  correctionCount
});
```

---

# 62. North-Star Product Metrics

The product needs a small number of outcome metrics.

Potential candidates:

### Time to first value

Time from first open → personalized usable plan.

### Logging friction

Median time from:

```text
tap log
→
confirmed meal
```

### Correction burden

Percentage of AI-parsed meals requiring correction.

### Action usefulness

Percentage of Next Best Actions accepted/completed.

### Personalization lift

Difference in relevant engagement between generic and learned recommendations.

### Retention

Day 1 / Day 7 / Day 30 / Day 90 return and meaningful-action rates.

Do not optimize raw screen views.

---

# 63. Instrument the Core Loop

Track this exact funnel:

```text
app_open
 ↓
today_viewed
 ↓
next_action_seen
 ↓
action_started
 ↓
action_completed
 ↓
state_updated
 ↓
recommendation_seen
 ↓
recommendation_accepted
```

This tells the team where friction occurs.

---

# 64. Experimentation Framework

Build feature flags before large UX experiments.

Examples:

```text
food_logger_v2
voice_logger_v2
today_next_action_v2
profile_wizard_v2
coach_context_v2
meal_confirmation_v2
```

Every experiment needs:

```text
hypothesis
primary metric
guardrail metric
exposure criteria
minimum sample
stop condition
```

Do not run experiments without defining what would make the team change its mind.

---

# 65. Guardrail Metrics

For example, improving logging speed must not increase:

```text
duplicate meals
incorrect calories
correction rate
support complaints
```

Improving Coach engagement must not increase:

```text
unsupported advice
user confusion
repeated prompts
latency
```

---

# 66. Release Strategy

Use progressive rollout:

```text
internal
 ↓
small cohort
 ↓
25%
 ↓
50%
 ↓
100%
```

At each stage monitor:

```text
errors
performance
conversion
corrections
crashes
AI failures
sync failures
```

Roll back automatically for critical regression thresholds.

---

# 67. Observability

Each request should have:

```text
requestId
traceId
user/session context
feature flag state
latency
status
error class
```

For AI calls additionally:

```text
model/provider
prompt/version identifier
input type
latency
token/cost metrics where appropriate
confidence
fallback path
```

Do not log raw sensitive user content unless explicitly required and protected.

---

# 68. Performance Instrumentation

Track real-user performance separately from synthetic checks.

Metrics:

```text
FCP
LCP
INP
CLS
long tasks
JS execution
memory pressure
navigation latency
animation frame drops
```

For the A52 specifically:

```text
cold launch
warm launch
Today render
food logger transition
voice activation
meal confirmation
Coach open
```

A feature is not "fast" because desktop Chrome is fast.

---

# 69. Motion QA

For each animation record:

```text
purpose
trigger
duration
easing
properties
reduced-motion behavior
interrupt behavior
performance risk
```

Example:

```yaml
id: meal-confirmation
purpose: show meal becoming part of today's state
trigger: meal.confirmed
duration: 650ms
easing: cubic-bezier(0.16, 1, 0.3, 1)
properties:
  - transform
  - opacity
reduced_motion: instant_state_transition
interruptible: false
performance_risk: low
```

This creates an auditable motion system.

---

# 70. Interaction Contracts

Every major interaction gets a written contract.

Example:

## Breakfast Add

### Entry

```text
Today → Breakfast +
```

### Expected

```text
opens Breakfast-context logger
```

### Cancel

```text
returns Today
```

### Confirm

```text
saves MealLog
emits meal.saved
updates nutrition state
recomputes Next Best Action
```

### Failure

```text
preserves draft
shows actionable recovery
```

This should be done for every core action.

---

# 71. UX State Matrix

Create a state matrix for every primary feature.

| Feature | Empty | Active | Loading | Success | Error | Offline | Permission denied |
|---|---|---|---|---|---|---|---|
| Food | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| Voice | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Training | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| Recovery | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| Coach | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |
| Sync | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a |

No primary feature ships with a missing state.

---

# 72. Automated UX Scenario Engine

Build automated journeys that behave like real users.

## Persona A — First timer

```text
open
→ onboarding
→ choose goal
→ complete profile
→ view targets
→ log breakfast
→ see updated Today
```

## Persona B — Returning user

```text
open
→ Today
→ quick log usual breakfast
→ train
→ log recovery
→ ask Coach
```

## Persona C — Interrupted user

```text
begin meal
→ background
→ return
→ resume
→ confirm
```

## Persona D — Failure user

```text
voice denied
→ fallback
→ manual search
→ confirm
```

## Persona E — Offline user

```text
disable network
→ log meal
→ verify local state
→ reconnect
→ verify sync
```

---

# 73. 30-Day Simulation

A simulated user should produce realistic history.

Day 1:

```text
profile
meal
workout
recovery
```

Day 2–7:

```text
repeated meals
occasional skipped meals
training variance
recovery variance
```

Day 8–14:

```text
habit emergence
```

Day 15–21:

```text
pattern recognition
```

Day 22–30:

```text
adaptive recommendations
```

The test question:

> Does NutriLift become measurably more useful after 30 days than on day 1?

---

# 74. 90-Day Simulation

Evaluate:

```text
habit stability
target adaptation
behavior patterns
recommendation precision
correction reduction
repeat logging speed
Coach usefulness
```

Also test:

```text
goal changes
schedule changes
body changes
training changes
diet preference changes
long inactivity periods
```

The system should adapt without losing historical context.

---

# 75. AI Safety / Trust Boundaries

NutriLift should explicitly distinguish:

```text
Tracking
Estimation
Recommendation
Medical advice
```

The product should not turn ordinary nutrition estimates into overconfident medical conclusions.

For uncertain or high-stakes questions:

```text
acknowledge uncertainty
avoid false precision
direct the user to appropriate professional guidance where necessary
```

---

# 76. Privacy Architecture

Define:

```text
what is stored locally
what is synced
what is sent to AI services
how long data remains
how users export data
how users delete data
```

Minimize data sent to third-party AI providers.

Do not expose sensitive user data to providers unless required for the feature and covered by the application's privacy model.

---

# 77. Data Deletion / Export

Account settings should support:

```text
Export my data
Delete my account
Delete meal history
Clear AI history
Reset personalization
Reset targets
```

Each destructive action requires clear consequences and recovery where appropriate.

---

# 78. Design System Maturity

Move from "screens sharing styles" to a real design system.

Tokens:

```text
color
spacing
radius
typography
elevation
motion
duration
easing
touch-target
breakpoints
```

Components:

```text
Button
IconButton
Card
Sheet
Tabs
SegmentedControl
Progress
Input
Rating
MealRow
WorkoutRow
InsightCard
ActionCard
```

Each component needs states:

```text
default
hover
pressed
focus
disabled
loading
success
error
```

---

# 79. Content Design System

Standardize wording.

## Use

```text
Log breakfast
Add meal
Try again
Couldn't understand
Estimated
Confirmed
Saved
```

## Avoid

```text
Submit
Proceed
Something went wrong
Execute
Invalid operation
```

The product should sound like a helpful coach, not an enterprise API.

---

# 80. Cognitive Load Gate

At every major decision point ask:

```text
What is the user's one job?
How many choices are visible?
Does each choice have a distinct meaning?
Can one choice be removed?
Can the choice be delayed until later?
```

Hard rule:

```text
Primary decision ≤ 4 visible options
```

When more options are required:

```text
group
progressive disclosure
secondary sheet
```

---

# 81. Persona QA Gate

Use three core personas for each important flow:

### Jordan — First timer

Question:

> Can I understand what to do without prior knowledge?

### Casey — Distracted mobile user

Question:

> Can I complete this one-handed while interrupted?

### Riley — Stress tester

Question:

> What breaks if I behave unexpectedly?

For accessibility-heavy surfaces also run Sam:

> Can this work keyboard/screen-reader first?

For expert/data-heavy workflows run Alex:

> Can I do this rapidly without unnecessary ceremony?

---

# 82. Acceptance Criteria for the Core Experience

## First session

A new user must be able to:

```text
complete profile
→ get targets
→ see Today
→ log meal
→ observe state update
```

without documentation.

## Returning session

A returning user must be able to:

```text
open
→ know next action
→ log usual meal
→ complete workout
```

without mentally reconstructing context.

## Logging speed

Measure the median:

```text
tap log
→ confirmed meal
```

Target:

```text
≤45 seconds
```

for a common meal after the system has learned the user's common foods.

The target should be measured, not assumed.

---

# 83. Quality Gates Before Release

A feature may ship only when all applicable gates pass.

## Functional

- all primary states implemented,
- no dead buttons,
- no silent failures,
- idempotent mutations,
- drafts recoverable.

## UX

- primary action obvious,
- context preserved,
- empty states useful,
- error recovery usable,
- terminology consistent.

## Motion

- purpose documented,
- reduced-motion path,
- interrupt behavior,
- no unnecessary loops.

## Performance

- target device tested,
- no unacceptable frame drops,
- interaction not delayed by animation,
- expensive effects bounded.

## Accessibility

- keyboard,
- focus,
- screen reader,
- touch target,
- reduced motion.

## Intelligence

- AI evaluated,
- confidence validated,
- provenance available,
- fallback path exists.

## Privacy

- data flow reviewed,
- storage reviewed,
- deletion/export paths tested.

---

# 84. Engineering Backlog — Workstreams

## W01 — Domain State Model

Canonical entities and state transitions.

## W02 — Commands & Events

Versioned command/event contract.

## W03 — Contextual Food Logger

Meal-aware unified logging.

## W04 — Voice Pipeline

Permission → recording → transcription → parsing → review.

## W05 — Food Intelligence

Matching, portions, confidence, provenance.

## W06 — Target Engine

Goal/profile/activity → calculated targets.

## W07 — Today State Aggregator

Single derived daily state.

## W08 — Next Best Action Engine

Candidate generation + ranking + evidence.

## W09 — Personalization Engine

Recent → frequent → usual → predictive → adaptive.

## W10 — Coach Context Engine

Grounded context assembly + response generation.

## W11 — Offline / Sync

Queues, idempotency, retry, conflict resolution.

## W12 — Analytics

Events, funnels, product metrics.

## W13 — AI Evaluation

Golden dataset + regressions + confidence calibration.

## W14 — Observability

Logs, traces, latency, errors, AI telemetry.

## W15 — Experimentation

Feature flags, cohorts, guardrails.

## W16 — Privacy / Security

Storage, deletion, export, provider boundaries.

## W17 — Motion System

Tokens, focal sequence, reduced motion.

## W18 — Accessibility System

Keyboard, screen reader, focus, semantics.

## W19 — Performance System

A52 real-device profiling + runtime budgets.

## W20 — Scenario Automation

30/90-day journeys + interruption/failure testing.

## W21 — Design System

Tokens + reusable components + state matrix.

## W22 — Content System

Terminology and UX copy standards.

---

# 85. Suggested Delivery Sequence

Do not implement all workstreams in numerical order.

Use dependency order:

```text
W01 Domain State Model
  ↓
W02 Commands & Events
  ↓
W11 Offline / Sync foundation
  ↓
W03 Food Logger
  ↓
W04 Voice
  ↓
W05 Food Intelligence
  ↓
W06 Target Engine
  ↓
W07 Today Aggregator
  ↓
W08 Next Best Action
  ↓
W09 Personalization
  ↓
W10 Coach
  ↓
W12 Analytics
  ↓
W13 AI Evaluation
  ↓
W14 Observability
  ↓
W15 Experimentation
  ↓
W16 Privacy/Security hardening
  ↓
W17 Motion
  ↓
W18 Accessibility hardening
  ↓
W19 Performance
  ↓
W20 Scenario Automation
  ↓
W21/W22 final systemization
```

Some workstreams should begin earlier in parallel, but this is the dependency backbone.

---

# 86. Definition of "10/10"

NutriLift should not be called 10/10 because:

- the screenshots look beautiful,
- animations are smooth,
- the AI sounds impressive,
- or there are many features.

10/10 means:

```text
The user always knows what is happening.
The user always knows what they can do next.
The system preserves context.
The system handles failure gracefully.
The system gets faster with repetition.
The system learns from outcomes.
The system can explain important recommendations.
The system is measurable.
The system is recoverable.
The system is performant on the actual target device.
The system is accessible.
The architecture can evolve without becoming fragile.
```

---

# 87. 10+/10 Differentiator

The product's real moat should not be:

> "NutriLift has AI."

It should be:

> **"NutriLift remembers what works for me and continuously turns that history into better next actions."**

The visible experience becomes:

```text
I log
 ↓
NutriLift learns
 ↓
NutriLift predicts
 ↓
I act
 ↓
NutriLift observes outcome
 ↓
NutriLift gets better
```

That is the product loop worth defending.

---

# 88. Final Brutal Rating After This Expansion

## Previous plan

**8.4/10**

Strong UX direction, but missing the deeper system.

## This execution blueprint

**9.6/10**

Why not 10?

There are still implementation-specific unknowns that should be resolved against the actual repository and deployed behavior:

- exact current data model,
- actual API routes,
- current persistence layer,
- actual auth/sync implementation,
- current AI provider boundaries,
- existing test coverage,
- current performance profile,
- exact browser/platform support,
- actual production analytics stack.

Those cannot be responsibly invented.

### 10/10 requires one final step:

**Repository + live-product implementation audit.**

That audit should map this blueprint against the real codebase:

```text
BLUEPRINT
   ↕
CURRENT REPO
   ↕
DEPLOYED APP
```

and produce:

```text
already implemented
partially implemented
incorrectly implemented
missing
architecturally risky
performance risky
UX broken
test missing
```

Only after that gap analysis should implementation begin.

---

# 89. The Next-Level Audit Deliverable

The next execution pass should create:

```text
NutriLift/
├── UX/
│   ├── ux-2.0-spec.md
│   ├── motion-system.md
│   ├── interaction-contracts.md
│   ├── state-matrix.md
│   └── content-system.md
│
├── Architecture/
│   ├── domain-model.md
│   ├── event-taxonomy.md
│   ├── api-contracts.md
│   ├── sync-model.md
│   ├── intelligence-model.md
│   └── privacy-model.md
│
├── AI/
│   ├── evaluation.md
│   ├── golden-dataset.md
│   ├── confidence.md
│   └── prompt-versioning.md
│
├── QA/
│   ├── scenarios-30d.md
│   ├── scenarios-90d.md
│   ├── accessibility.md
│   ├── performance.md
│   └── regression-matrix.md
│
└── Product/
    ├── metrics.md
    ├── experiments.md
    └── rollout.md
```

This is the level at which NutriLift becomes maintainable rather than just impressive.

---

# 90. Final Execution Principle

The next sprint should not be:

> "Build the new screens."

It should be:

> **"Make the core loop deterministic, measurable, recoverable, explainable and increasingly personalized — then let the screens become projections of that system."**

That is the jump from **8/10 product work** to **10+/10 product engineering**.
