## NutriLift P0 Repair Specification

This file turns the brutal audit into implementation work. Apply in this order.

### 1. Security
- Remove any client-side provider-key input/storage path.
- The only provider credential must be the Supabase Edge Function secret.
- UI copy must say AI requires the authenticated gateway, not a local Groq key.

### 2. Date correctness
- Add one local-calendar date helper and use it for all user-facing day keys.
- Replace every `new Date().toISOString().split("T")[0]` used as a calendar-day identifier.
- Add regression tests around timezone boundaries.

### 3. Sync source model
- Add a first-class `body.nutrition.food` record type.
- Export food-log rows with immutable IDs.
- Add `updated_at` to `food_logs` and `supplement_logs`.
- Use source modification time for update ordering.
- Generate tombstones with the original external ID.
- Preserve daily nutrition as a derived summary, but do not use it as the only nutrition source.

### 4. Cursor correctness
- Do not advance the global cursor past an unvalidated/failed source timestamp.
- Keep invalid records observable with error reason and retry metadata.
- Add a test where record 50 is invalid and record 51 is newer.

### 5. User-owned targets
- Finish migration from hard-coded `USER_PROFILE.targets` to persisted profile rows.
- Every calculator and AI context builder must read the same profile repository.
- Add migration tests for existing installs.

### 6. Recovery trust
- Replace implied precision in recovery score UI with a confidence/freshness presentation.
- Clearly separate self-reported recovery from device-derived metrics.

### 7. Logging UX
- Add recent foods, repeat meal, repeat yesterday and saved recipes as primary actions.
- AI food results must show confidence and source.
- Add a fast numeric macro/calorie entry path.
- All food entry methods must converge on one confirmation/edit screen.

### 8. Sync UX
- Add Integrations > NutriLift.
- Show connection state, last success, last attempt, pending, failed, and latest source update.
- Errors need a human-readable reason and recovery action.

### 9. Tests
Mandatory regression scenarios:
- create/update/delete food
- delete last food of a day
- stale delivery
- duplicate upload
- duplicate import
- invalid record in middle of batch
- offline -> reconnect
- auth expiry
- wrong-user RLS read/write
- timezone boundary
- profile migration
- first-sync with 10k records in bounded batches

### 10. Release gate
Do not call this production-ready until:
- TypeScript passes
- Jest passes
- Expo diagnostics pass
- Android preview build passes
- device smoke test passes
- sync integration tests pass against a real Supabase project
- RLS negative tests pass
- offline/auth/network failure tests pass
