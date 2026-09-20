# NutriLift

NutriLift is a local-first fitness and nutrition tracker built with Expo and React Native. It supports workout logging, nutrition tracking, body-composition records, recovery signals, AI coaching, and a prepared Supabase sync layer.

The app remains fully usable without a network connection. User data is stored locally in SQLite and, once configured, selected health records are queued for authenticated Supabase sync.

## Capabilities

- Workout sessions, exercises, sets, volume, and personal records
- Food logging by manual entry, voice input, barcode, and food lookup
- Daily nutrition totals and adherence tracking
- Weight, InBody, sleep, HRV, energy, soreness, and stress records
- AI-assisted nutrition parsing, coaching, and progress summaries through Groq
- Progress-report PDF export
- Local-first queued sync with deterministic record IDs, tombstones, retries, and user-scoped Supabase records

## Technology

| Area | Implementation |
| --- | --- |
| Mobile | Expo SDK 54, React Native, Expo Router |
| Language | TypeScript |
| Local data | Expo SQLite and Drizzle ORM |
| State | Zustand and Immer |
| AI | Groq |
| Secure session storage | Expo Secure Store |
| Cloud sync | Supabase Auth, Postgres, and Row Level Security |

## Prerequisites

- Node.js 18 or later
- npm
- Android Studio and an emulator for native Android builds, or Expo Go for development
- A Supabase project and authenticated account for AI features

## Install And Run

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm start
```

Start an Android build with:

```bash
npm run android
```

Start the web target with:

```bash
npm run web
```

The `--legacy-peer-deps` flag is currently required because of the Expo/Jest peer-dependency combination in this project.

## Environment Configuration

Create `.env` from `.env.example` and configure the values required by the features you use.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never put a Groq API key or Supabase service-role key in the mobile app. The client only uses the project URL and public anon key. Sync stays disabled until both values are valid.

AI calls go through the authenticated `ai-chat` Edge Function. Apply the gateway migration, set the server-side secret, then deploy the function:

```bash
supabase db push
supabase secrets set GROQ_API_KEY=your_groq_api_key
supabase functions deploy ai-chat
```

The function verifies the Supabase JWT, accepts only the configured model, and enforces request-size, output-token, and daily per-user limits.

## Local Data And Sync

NutriLift stores app data on-device in SQLite. The current database filename is retained as `apex.db` solely for backward compatibility with existing installations; it is not user-facing and should not be renamed without a data migration.

The sync contract is implemented under `lib/integrations/life-os/`:

- records have deterministic `external_id` values
- changes are queued locally before upload
- sync state uses a source-update cursor
- deletes are emitted as tombstones
- personal-record tombstones preserve their original external IDs
- Supabase rows are written to `public.sync_records`

The prepared Supabase schema and Row Level Security policies are in:

```text
supabase/migrations/202609200001_nutrilift_sync.sql
```

Apply that migration only after creating the intended Supabase project and configuring Auth. NutriLift and any connected consumer must use the same Supabase project, the same signed-in user, and the `sync_records` table.

## Project Layout

```text
app/                         Expo Router screens and modals
components/                  Shared application UI
design-system/               Theme tokens
lib/db/                      SQLite client, schema, and data queries
lib/integrations/life-os/    Sync contract, mappers, queue, and client
lib/supabase/                Supabase client and authentication helpers
lib/groq/                    AI prompts and Groq services
supabase/migrations/         Cloud schema and RLS policies
supabase/functions/          Authenticated server-side integrations
src/__tests__/               Focused sync contract tests
android/                     Native Android project
```

## Quality Checks

Run the focused sync tests:

```bash
npx jest --runInBand src/__tests__/nutrilift-sync.test.ts src/__tests__/nutrilift-record-mappers.test.ts
```

Run the TypeScript check:

```bash
npx tsc --noEmit --pretty false
```

Run the full configured test suite:

```bash
npm test
```

## Android Identity

NutriLift uses `com.prithvi.nutrilift` as its Android application ID and native package namespace. A native rebuild is required after this identifier change.

## Current Limits

- Live Supabase deployment and end-to-end authentication still require a real Supabase project and configured environment variables.
- Sync is designed for native SQLite. It is unavailable on web when the native database is not present.
- AI capabilities require a deployed `ai-chat` Edge Function, an authenticated Supabase user, and network access.
