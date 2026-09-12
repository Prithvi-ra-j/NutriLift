# Apex

> AI-Powered Fitness & Nutrition Tracking — React Native

Apex is a comprehensive fitness tracking application that combines workout logging, nutrition tracking, and AI coaching. Built with React Native (Expo), SQLite, and Groq AI.

---

## Features

### AI-Powered Capabilities

**Voice Input**  
Speak your meals naturally — AI transcribes and parses them into structured nutrition logs. Supports English, Hindi, and Hinglish.

**Intelligent Food Parsing**  
Natural language understanding with automatic macro calculation. Built-in Indian food database for accurate nutritional information.

**AI Coach**  
Contextual fitness coaching that accesses your actual workout and nutrition data to provide personalized advice.

**Smart Reports** `[EXPERIMENTAL]`  
Weekly and monthly AI-generated summaries with trend analysis and actionable insights.

### Core Features

**Nutrition Tracking**
- Voice, manual, or barcode-based food logging
- Macro and calorie tracking with daily targets
- Meal-by-meal breakdown (breakfast, lunch, snack, dinner)
- 7-day adherence tracking

**Workout Logging**
- Exercise and set tracking with Personal Record auto-detection
- Exercise-type-aware logging (weight, reps-only, duration, cardio)
- Delete, swap, and edit exercises and sets inline
- Workout templates and double-progression alerts

**Progress Analytics**
- Body composition tracking (InBody paste support)
- Weight and measurement logs
- Interactive charts and graphs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native with Expo SDK 54 |
| Language | TypeScript |
| Database | SQLite + Drizzle ORM |
| Design System | Material 3 (M3) dark theme |
| State Management | Zustand with Immer |
| AI Provider | Groq API (LLaMA 3.3 70B + Whisper) |
| Navigation | Expo Router |

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your GROQ_API_KEY to .env

# Start development server
npm start

# Run on device
npm run ios     # iOS
npm run android # Android
```

---

## Project Structure

```
apex/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home / Dashboard
│   │   ├── nutrition.tsx  # Nutrition tracking
│   │   ├── workout.tsx    # Workout logging
│   │   ├── coach.tsx      # AI Coach chat
│   │   ├── progress.tsx   # Progress analytics
│   │   └── more.tsx       # Settings & more
│   └── modals/            # Modal screens
├── components/
│   └── ui/                # Shared UI components (Card, MacroBar, etc.)
├── design-system/
│   └── tokens.ts          # M3 design tokens (colors, shape, typography)
├── lib/
│   ├── db/
│   │   ├── schema.ts      # Drizzle table definitions + TypeScript types
│   │   ├── client.ts      # DB client + startup migrations
│   │   └── queries/       # Per-feature query modules
│   ├── constants/
│   │   ├── exercises.ts   # Exercise library with ExerciseType
│   │   └── workout-templates.ts
│   ├── groq/              # Groq AI integration
│   ├── stores/            # Zustand state stores
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── assets/                # Static resources
├── docs/                  # Documentation
└── android/               # Native Android code
```

---

## AI Integration

### Models Used

**Whisper Large V3 Turbo**  
Voice transcription with multi-language support. Latency: 2-5 seconds.

**LLaMA 3.3 70B Versatile**  
Food parsing, coaching, and report generation. Latency: 1-5 seconds.

### API Configuration

All AI features use Groq API with automatic retry, rate limiting, and error handling.

---

## Database

### Schema Overview

| Table | Purpose |
|---|---|
| `food_logs` | Food entries with full macro breakdown |
| `daily_nutrition` | Aggregated daily nutrition summaries |
| `workout_sessions` | Workout session records |
| `exercise_logs` | Per-exercise log with `exercise_type` metadata |
| `set_logs` | Sets with `weight_kg`, `reps`, `duration_sec`, `distance_km` |
| `personal_records` | Auto-detected PRs per exercise |
| `body_stats` | Weight and InBody composition data |
| `recovery_logs` | Sleep, HRV, energy, soreness |
| `ai_conversations` | Coach chat history |

### Migrations

Schema changes are applied automatically at app startup via `runMigrations()` in `lib/db/client.ts`.

New columns use `ALTER TABLE` with error-catch for existing columns — **safe and non-destructive** on existing user databases.

---

## Development

### Common Commands

```bash
npm start              # Start Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Apply migrations
npx tsc --noEmit --skipLibCheck  # Type check
```

---

## Troubleshooting

### API Key Issues

**Problem:** "API key not configured"  
**Solution:** Verify `.env` exists with `GROQ_API_KEY` set, then restart the dev server.

### Rate Limiting

**Problem:** "Rate limit exceeded"  
**Solution:** Wait 60 seconds. Monitor usage at https://console.groq.com

### Voice Input

**Problem:** Voice transcription not working  
**Solution:** Grant microphone permissions, verify audio format (m4a), check API key.

### Build Errors

```bash
cd android && ./gradlew clean && cd .. && npm start
```

See [Issues & Fixes](docs/ISSUES_AND_FIXES.md) for comprehensive troubleshooting.

---

## Design System

The app uses a **Material 3 (M3) dark theme** seeded from `#00D4AA` (teal).

All tokens live in [`design-system/tokens.ts`](./design-system/tokens.ts) — imported as `M3` throughout the codebase. No raw hex strings in screens or components.

### Key Color Tokens

| Token | Value | Role |
|---|---|---|
| `background` | `#0F0F13` | Screen background |
| `surface` | `#16161E` | Cards |
| `surfaceVariant` | `#1E1E2A` | Elevated cards, inputs |
| `surfaceContainer` | `#22222F` | Chips, pills, nav bar |
| `primary` | `#00D4AA` | CTAs, active states |
| `primaryContainer` | `#003829` | Active pill, badges |
| `secondary` | `#7CACF8` | Protein / nutrition |
| `tertiary` | `#B69DF8` | Volume / workout |
| `error` | `#FF5449` | Destructive actions |
| `warning` | `#FFB800` | Alerts |
| `onSurface` | `#E8E8F0` | Primary text |
| `onSurfaceVariant` | `#909090` | Secondary text |

### Shape Scale

| Token | Value | Usage |
|---|---|---|
| `small` | 8px | Chips, pills |
| `medium` | 12px | Buttons, inputs |
| `large` | 16px | Cards |
| `extraLarge` | 28px | Modal corners |

### Typography

- **Display** — BebasNeue 400 (screen titles)
- **Headline / Title** — DMSans 700 Bold
- **Body** — DMSans 400 Regular
- **Label** — DMSans 500 Medium

---

## Changelog

### August 2026

#### Workout Plan & Exercise Management

- **Delete exercise** — Trash icon with confirmation alert removes exercise + all sets
- **Swap exercise** — Replace icon opens library search to substitute exercises mid-session
- **Edit logged sets** — Tap any set pill → inline pre-filled edit form with save & delete options
- **Exercise-type-specific logging** — Form adapts per exercise type:
  - `weight_reps` → Weight (kg) + Reps + RPE + Warmup *(bench press, squats, etc.)*
  - `reps_only` → Reps/Count + RPE + Warmup *(pull-ups, dips, bodyweight)*
  - `duration` → Duration in seconds *(planks, stretches, stability work)*
  - `distance_duration` → Distance (km) + Duration (min) *(treadmill, cycling, rowing)*
- **Smart set pills** — Labels adapt to type: `90kg × 8`, `× 15 reps`, `45s`, `5.2km · 28min`
- **Volume calc fixed** — Only `weight_reps` exercises count toward session total volume

#### Database

- `set_logs.duration_sec` — Duration in seconds for time-based exercises
- `set_logs.distance_km` — Distance for cardio exercises
- `exercise_logs.exercise_type` — Persisted exercise type per log entry
- `updateExerciseLog()` — New query for exercise swap feature
- All migrations are non-destructive (safe `ALTER TABLE` pattern)

#### Material 3 Design System — Phase 1

- **`design-system/tokens.ts`** — Single source of truth: M3 colors, shape, typescale, spacing, elevation, macro colors, day-type accent colors
- **Card** — M3 surface spec: `16px` radius, three variants (`filled` / `elevated` / `outlined`), token colors
- **Navigation Bar** — M3 nav bar: active pill indicator (`primaryContainer`), `80px` height, keyboard-aware
- **Global token rollout** — All 6 tab screens, 8 UI components, and modals use `M3.*` tokens — no raw hex strings

---

## Experimental Features

| Feature | Status | Notes |
|---------|--------|-------|
| Smart Reports | Experimental | AI weekly/monthly summaries |
| Workout Templates | Experimental | Pre-built workout plans |
| Barcode Scanner | Experimental | Limited food database |
| PDF Export | Experimental | Formatting in progress |

---

## Platform Support

**iOS:** 13.0+  
**Android:** API 26 (Android 8.0)+

---

## Production Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

See [EAS Setup](docs/EAS_SETUP_COMPLETE.md) for details.

---

## License

Private project — All rights reserved

---

**Built with React Native, Expo, and Groq AI**
