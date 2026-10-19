# NutriLift — Brutal Production Audit + Repair Report

**Repository audited:** `Prithvi-ra-j/NutriLift`  
**Commit audited:** `9ae4e4bc825cb5790048ec862b332e118af86797`  
**Date:** 2026-09-29

## Executive verdict

**Shipped-main verdict: 6.1/10.**

The score is intentionally harsh. The repo has a substantially stronger engineering foundation than a typical side project, but it is not yet at the reliability bar implied by its feature set. The biggest issue is not missing features. It is truthfulness under failure: data can be logged locally, derived, synced, deleted, edited, and explained by AI, so every layer has to preserve identity, timestamps, provenance, and user intent.

The open redesign PR is not counted as shipped quality. It explicitly says device validation and later sync hardening remain, so it is treated as work-in-progress rather than evidence of production readiness.

## What is genuinely strong

- Local-first SQLite/Drizzle architecture.
- Authenticated Supabase layer with RLS.
- Sync queue, retries, tombstones, deterministic IDs, and cursor state are already present.
- AI gateway exists and restricts models/request sizes.
- There is a real component/design-system layer and meaningful automated test infrastructure.
- Food logging supports manual/voice/barcode paths.
- Workout, recovery, body composition, reports, and coaching are all represented.

## Critical findings

### P0 — Sync does not represent the actual source-of-truth data model completely

Food logs are authoritative source records in the app, but the sync schema/mapper exports daily nutrition summaries rather than the underlying food-log entities. This means a user can add/edit/delete an individual meal and the downstream consumer cannot reconstruct the exact food event history from sync records.

Worse, deleting the last food log removes the daily nutrition summary locally. There is no corresponding food-log tombstone path in the existing sync repository. Downstream consumers can therefore retain stale nutrition evidence.

**Required fix:** export immutable food-log records as first-class sync entities, or explicitly define daily nutrition as the only exported contract and create durable tombstones for deletion of the summary. For Actions-Tracker integration, first-class food events are the safer choice.

### P0 — Source timestamp fallback is semantically wrong

`recordMappers.ts` uses mapper execution time when a source row lacks `updated_at`.

This violates the contract required for safe incremental sync. A late sync of an old row can look newer than a genuinely newer source record.

**Required fix:** every syncable source table must have a real source modification timestamp. Missing timestamps should be migrated/backfilled deterministically, not replaced with mapper-time.

### P0 — Cursor advancement is unsafe around validation/rejection

The client filters invalid changed records, uploads the valid queue, then advances the cursor to the newest queued record. If a changed record is invalid and falls inside the processed source-time range, advancing the global cursor can permanently skip it.

**Required fix:** advance the cursor only over a verified contiguous source-time boundary, or maintain per-record checkpoints. Invalid records must remain observable and retryable without being silently skipped.

### P0 — AI security model is internally inconsistent

The main `lib/groq/client.ts` uses the authenticated `ai-chat` Edge Function, which is good. However, Settings still exposes a UI path for a user-entered Groq API key and stores it in AsyncStorage, while Coach copy still tells users to configure a Groq key locally.

That conflicts with the repository's stated server-side secret architecture.

**Required fix:** delete the client-side Groq-key storage/UI path completely. Only the Supabase Edge Function may hold provider credentials.

### P0 — Date handling is vulnerable to timezone errors

Multiple screens derive the daily key via `new Date().toISOString().split('T')[0]`. Around local midnight this can resolve to the previous UTC date. The open redesign PR recognizes this and contains a local-date utility, but that work is not merged into main.

**Required fix:** centralize all user-facing date keys on local calendar dates.

### P1 — Nutrition target configuration is effectively static

Screens and analytics read from a hard-coded `USER_PROFILE`. That makes user goals, targets, and assumptions part of source code rather than durable user-owned data. The open redesign PR begins moving profile data into SQLite; that work should be completed and merged only after migration tests.

### P1 — Recovery is self-reported but presented as a precise 0–100 score

The dashboard turns 1–5 subjective values into a precise score. That invites false precision. The UI should show component values, data freshness, and a confidence/coverage indicator rather than implying clinical-grade recovery measurement.

### P1 — AI context provenance is weak

Coach responses store a context snapshot, but the product does not expose a clear 'what data this answer used' layer. For an AI fitness product, factual claims should be traceable to local records and visibly distinguish observations from advice.

### P1 — Exercise/PR identity and deletion propagation need stronger lifecycle semantics

Personal records are keyed by exercise name, while the broader sync contract emphasizes stable immutable source identity. Exercise renames can therefore collide with identity expectations.

### P1 — Error handling often degrades into generic alerts

The product has error infrastructure, but user-facing failures need structured states: what failed, what is still safe, what will retry, and what the user can do.

### P1 — Web is presented as a runnable target but intentionally lacks the local database

The README says web is runnable, while DB calls are replaced by a no-op mock. This can create a deceptive 'the app works' experience where interactions appear functional but data persistence is absent.

**Required fix:** either make web explicitly a read/demo surface, or implement a real web persistence adapter.

## Brutal practical scenario tests

| Scenario | Expected | Current risk |
|---|---|---|
| Delete the only food of a day | Consumer receives deletion | **Fail / stale downstream risk** |
| Edit food after initial sync | Same source identity updates | **Incomplete source contract** |
| User logs at 00:05 IST | Correct local date | **Risk: UTC date mismatch** |
| Offline for 3 days, then reconnect | All local mutations upload once | **Needs stronger cursor proof** |
| One bad record in a 100-record batch | Good records sync; bad record remains retryable | **Risk of cursor skip** |
| User changes protein target | All screens/analytics follow new target | **Main uses code constant** |
| AI provider key leaked from device storage | No provider secret exists client-side | **Current UI/storage contradicts this** |
| Delete workout after sync | Consumer gets tombstone | **Only selected entity classes covered** |
| Rename exercise | Historical PR identity remains stable | **Exercise-name identity is weak** |
| API outage during AI chat | User gets useful retry state | **Needs tighter UX** |
| App upgraded after schema change | Existing local DB preserved | **Migration proof needs CI** |
| 10k records first sync | Bounded/resumable import | **Not sufficiently proven by tests** |
| User never signs in | Core tracking works | **Mostly yes** |
| Supabase unavailable | Core tracking works | **Yes by design** |
| Wrong account signs in | User cannot see another user's records | **RLS exists; needs automated negative test** |

## UI audit — independent of UX

UI is visually promising, but consistency is not yet production-grade.

### Strengths

- Strong dark visual direction.
- Design tokens exist.
- Reusable cards, buttons, macro components, skeletons, and list primitives exist.
- Good use of typography hierarchy.
- The redesign PR's navigation concept is more focused than the current shipped six-item navigation.

### Weaknesses

1. Too many one-off inline styles. Screen files contain large amounts of styling logic, so visual consistency can drift.
2. Dashboard density is high. Nutrition, macros, volume, recovery, protein pacing and adherence compete for first-glance attention.
3. Status semantics depend too heavily on color. Red/amber/green adherence needs icons/text for accessibility.
4. Small typography is overused. Several labels are around 9–13 px, which becomes painful on workout screens.
5. Primary action hierarchy is inconsistent. Log food, workout controls, and coach actions do not have one consistent action grammar.
6. Settings is overloaded. Body data, supplements, recovery, reports, auth, sync, and AI configuration share one large screen.
7. Coach empty-state is attractive but not sufficiently task-oriented. Suggested prompts are useful, but there is limited indication of current context, data freshness, or what the coach can actually access.
8. The current main branch is behind the redesign PR visually. The redesign explicitly includes a rebuilt Today hierarchy, interaction primitive, macro ring, and centered logging action.

## UX audit — independent of UI

UX is where the largest product gap sits.

### The central UX problem

**Logging is the product. Everything else is downstream.**

Reddit discussions repeatedly point to the same pattern: users quit tracking when logging becomes tedious. People praise recent-food reuse, low-friction entry, barcode scanning, simple macro tracking, and avoiding unnecessary upsells/paywalls. Reddit threads also repeatedly surface frustration with Indian-food accuracy and the ambiguity of homemade recipes.

Implication: NutriLift should optimize for **seconds-to-correct-log**, not feature count.

### UX gaps

- No strong first-class repeat yesterday / repeat meal / recent food loop in shipped main.
- No clear recipe workflow for recurring home-cooked Indian meals.
- No explicit uncertainty model for AI-estimated food.
- No quick-calories/macros-only escape hatch.
- Barcode/voice/image paths need a common confirmation/edit flow.
- Logging should remember serving size, meal context, and prior selections aggressively.
- Workout entry needs the same previous-session-first philosophy as food logging.
- User should be able to fix mistakes immediately without navigating through several layers.
- Offline/queued operations should be invisible by default and explainable when relevant.
- Sync should have a trustworthy status surface, not just a button and an alert.
- Health/recovery metrics need insufficient-data states rather than pseudo-precision.

Reddit evidence strongly supports optimizing for low friction and repeatability: users describe food logging as tedious, praise apps that remember repeated foods, and complain when useful tracking features are paywalled. citeturn467358reddit34turn467358reddit35turn467358reddit36
Indian users also repeatedly call out Indian-food accuracy, noisy upsells, and the impracticality of weighing every homemade portion. citeturn387299reddit31turn387299reddit34turn387299reddit36

## Reddit-standard reality check

This is not a formal Reddit score. Reddit is anecdotal and community-dependent. The useful benchmark is recurring user expectations:

- low-friction logging
- strong recent/repeat workflows
- usable free/core tracking
- Indian-food coverage
- fewer intrusive upsells
- trustworthy nutrition estimates
- clean/minimal UI
- useful barcode/voice/photo input
- meaningful history/trends

Against those expectations, NutriLift is feature-rich but still too much of a developer-built tracker and not yet enough of a habit-preserving tracker.

## Recommended product architecture

### Source of truth

NutriLift owns fitness/nutrition source records.

Actions-Tracker owns interpretation, evidence, goals, and higher-level life intelligence.

Supabase is the transport layer.

This matches the existing integration plan: NutriLift owns fitness data, Actions-Tracker owns interpretation, and the two local databases must not directly connect. fileciteturn0file0L41-L105

### Data contract

Every source record should contain:

- `schemaVersion`
- `sourceApp`
- `externalId`
- `recordType`
- `occurredAt`
- `sourceUpdatedAt`
- `payload`
- `deleted`

The integration plan explicitly requires stable identity, deterministic sync, and idempotency. fileciteturn0file0L108-L132

## 10/10 target

NutriLift should not reach 10/10 by adding more AI.

It reaches 10/10 when:

1. Any local mutation is durable.
2. Every exported record has immutable identity.
3. Every update has a real source modification time.
4. Deletes are durable and propagate.
5. Sync is idempotent and resumable.
6. One bad record cannot block or silently skip later data.
7. The user can see exactly what synced and why something failed.
8. AI answers expose data provenance and uncertainty.
9. Food logging for a repeat meal takes seconds.
10. Workout logging remembers the prior session automatically.
11. Targets are user-owned data, not source constants.
12. No secret provider credentials are stored client-side.
13. All important behavior has automated regression tests.
14. Device testing covers real offline/network/auth transitions.
15. The app remains useful when every cloud/AI service is down.

## Implementation priority

### P0

- Remove client Groq key path.
- Add first-class food log synchronization or durable food deletion projection.
- Fix source timestamps.
- Make cursor advancement contiguous/safe.
- Centralize local-date handling.
- Add negative RLS tests.
- Add sync deletion/update integration tests.

### P1

- Merge the redesign only after typecheck/test/Expo diagnostics/device validation.
- Persist user profile/targets.
- Add recent/repeat meals and recipes.
- Improve recovery semantics and freshness/confidence.
- Create a dedicated Integrations screen.
- Make sync errors actionable.

### P2

- Refactor inline UI styles into reusable primitives.
- Improve empty/loading/error states.
- Add data provenance surfaces.
- Expand micronutrients and Indian-food depth.
- Add import/export/backup validation.

## Final rating

**Current main: 6.1/10**

| Dimension | Rating |
|---|---:|
| Engineering foundation | 7.7/10 |
| Data correctness | 5.4/10 |
| Sync reliability | 5.0/10 |
| Security model | 6.2/10 |
| AI trustworthiness | 6.0/10 |
| UI quality | 7.1/10 |
| UX quality | 5.8/10 |
| Offline resilience | 7.4/10 |
| Testing maturity | 6.4/10 |
| Real-world habit fit | 5.7/10 |

The codebase is worth continuing. The next step is not more features; it is making the current features boringly reliable.