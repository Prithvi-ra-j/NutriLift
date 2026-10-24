# NutriLift

NutriLift is an Android fitness and nutrition tracker built with Expo and React Native.
It stores workout and nutrition records in a local SQLite database.
Optional cloud sync and AI requests use authenticated Supabase services.

## Features

<!-- features:start -->
| Feature | State | Test file |
| --- | --- | --- |
| Barcode food data normalization | Working | `lib/services/__tests__/barcodeScanner.test.ts` |
| AI request and output safety validation | Working | `lib/ai/__tests__/aiSafetySchemas.test.ts` |
| Coach response validation and target clamping | Working | `lib/ai/__tests__/coach.test.ts` |
| Summary feature-flag defaults | Working | `lib/__tests__/featureFlags.test.ts` |
| Body-composition comment safety gate | Working | `lib/analytics/__tests__/bodyCompSafety.test.ts` |
| Toast queue and undo action | Beta | `components/ui/__tests__/Toast.test.tsx` |
| Workout progression rules | Beta | `lib/domain/__tests__/domain.test.ts` |
| Supabase sync transport | Beta | `lib/integrations/life-os/syncClient.test.ts` |
<!-- features:end -->

The feature table is checked against [`docs/features.json`](docs/features.json) by `npm run check:readme`.

## Quick start

Requirements: Node.js 22.13 or later, npm, and an Android emulator or device.

```bash
npm ci
```

Copy `.env.example` to `.env`, add the Supabase project URL and public anon key if using cloud features, then start Expo:

```bash
npx expo start
```

Run the native Android app with `npm run android`. The app targets Android; a web build is not supported.

## Environment

| Name | Used by | Secret |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase client and cloud sync | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase client and cloud sync; protected by RLS | No |
| `EXPO_PUBLIC_OFF_CONTACT_EMAIL` | Open Food Facts User-Agent for barcode lookup; set in local/EAS build configuration | No |

Only public configuration belongs in app build environment variables. `.env.example` contains the two Supabase values; barcode lookup additionally requires a project contact email. Provider keys and the Supabase service-role key are server-side secrets; see [`docs/RUNBOOK.md`](docs/RUNBOOK.md). Never bundle them in the app.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the Expo development server |
| `npm run android` | Build and run the native Android app |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm test -- --ci` | Run Jest tests |
| `npm run verify` | Run typecheck, lint, tests, and README consistency checks |
| `npm run test:supabase` | Run local Supabase SQL tests; Docker must be available |

## Architecture and data

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the data flow and invariants. SQLite uses the existing `apex.db` filename so upgrades do not orphan installed users' data. Supabase sync is opt-in and user-scoped; configure and validate the intended project before applying migrations.

## Release

Android preview APKs use the internal `preview` EAS profile. Production Android releases use the `production` profile and build an app bundle:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

Native permission, package, or database-migration changes require a new binary. Use an OTA update only for JavaScript changes compatible with the installed runtime fingerprint.

## Troubleshooting

- **Cloud features are unavailable:** check the two public Supabase values, Auth configuration, and that the user is signed in.
- **AI requests fail:** confirm the authenticated Edge Functions and server-side secrets are configured; do not put provider keys in `.env`.
- **Database migration fails:** keep the app data intact, capture the error, and use the migration recovery guidance in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
- **SQL tests cannot connect:** start Docker Desktop and the local Supabase stack before running `npm run test:supabase`.
