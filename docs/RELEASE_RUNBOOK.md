# NutriLift Release and Rollback Runbook

## Pre-release gates

A release is blocked until all required GitHub Actions jobs pass:

- TypeScript
- ESLint
- Unit tests
- SQLite migration tests
- Expo config and asset validation
- Supabase Edge Function typecheck
- Clean Android debug build

Also complete a smoke test on a physical Android device for sign-in, food logging/edit/delete, daily nutrition recalculation, workout logging, voice transcription, AI Coach, and sync retry after temporary network loss.

## Supabase deployment order

1. Confirm the target Supabase project and that the deployed Edge Functions use server-side secrets only.
2. Apply database migrations to a non-production project first and verify the atomic AI usage reservation function.
3. Run concurrent reservation tests for a single user near the daily limit. At most the configured daily limit should return a successful reservation.
4. Configure the required Edge Function secrets through the Supabase secrets manager. Never put provider keys in app configuration or client storage.
5. Deploy `ai-chat` and `ai-transcribe`.
6. Smoke-test authenticated requests, unauthenticated requests, malformed JSON, oversized payloads, unsupported models/MIME types, daily quota exhaustion, and provider outages.
7. Deploy to production only after the above checks pass.

## Rollback

### Edge Functions

1. Redeploy the last known-good versions of `ai-chat` and `ai-transcribe` first.
2. Confirm the rolled-back functions no longer call `reserve_ai_request_usage`.
3. Only then, if required, remove the reservation function with a reviewed database migration. Do not drop `ai_request_usage`; it is the usage audit table.
4. Keep provider secrets server-side. Rotate credentials if there is evidence they were exposed; removing the client UI does not rotate credentials.

### Android release

- Stop staged rollout in the relevant store if a release regression is found.
- If the installed app supports Expo Updates and a compatible known-good update is available, roll back the update through the release tooling.
- For native binary regressions, publish a corrected build. Do not assume an OTA update can repair native dependency or native project changes.

## Branch and repository hygiene

- Keep `main` as the only canonical integration branch.
- Merge only changes that passed the required checks and were reviewed against current `main`.
- Close superseded pull requests only after their useful changes are either integrated or explicitly rejected.
- Delete obsolete feature branches and the stale `master` branch only after confirming they contain no unintegrated work.
- Configure `main` branch protection in GitHub repository settings to require the CI checks and prevent force pushes/deletion.
- Create a release tag only after the production smoke test passes and the exact release commit is recorded.

## Current execution boundary

This runbook is documentation, not proof that a production deployment, secret rotation, branch protection change, release tag, or physical-device test has occurred. Record those actions only after they have actually been completed.
