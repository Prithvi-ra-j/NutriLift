# NutriLift

> AI-Powered Fitness Tracking for React Native

NutriLift is a comprehensive fitness tracking application that combines traditional workout and nutrition logging with cutting-edge AI capabilities. Built with React Native and powered by Groq AI, it provides intelligent food parsing, voice transcription, and personalized coaching.

---

## Features

### AI-Powered Capabilities

**Voice Input**  
Speak your meals naturally and let AI transcribe and parse them into structured nutrition logs. Supports English, Hindi, and Hinglish.

**Intelligent Food Parsing**  
Natural language understanding with automatic macro calculation. Built-in Indian food database for accurate nutritional information.

**AI Coach**  
Contextual fitness coaching that accesses your actual workout and nutrition data to provide personalized advice.

**Smart Reports** `[EXPERIMENTAL]`  
Weekly and monthly AI-generated summaries with trend analysis and actionable insights.

### Core Features

**Nutrition Tracking**
- Voice, manual, or barcode-based food logging
- Macro and calorie tracking
- Meal history and patterns
- Daily nutrition summaries

**Workout Logging**
- Exercise and set tracking
- Personal record detection
- Workout templates `[EXPERIMENTAL]`
- Progress monitoring

**Progress Analytics**
- Body composition tracking
- Weight and measurement logs
- Interactive charts and graphs
- Goal setting and tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native with Expo SDK 54 |
| Language | TypeScript |
| Database | SQLite + Drizzle ORM |
| Styling | NativeWind (Tailwind CSS) |
| State Management | Zustand with Immer |
| AI Provider | Groq API (LLaMA 3.3 70B + Whisper) |
| Navigation | Expo Router |

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI (optional)
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

### Environment Setup

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your free API key at: https://console.groq.com/keys

**Free Tier Limits:**
- 30 requests per minute
- 14,400 requests per day

---

## Project Structure

```
nutrilift/
├── app/                 # Expo Router screens
│   ├── (tabs)/         # Tab navigation screens
│   └── modals/         # Modal screens
├── components/         # Reusable UI components
├── lib/
│   ├── db/            # Database schema and queries
│   ├── groq/          # Groq AI integration
│   ├── stores/        # Zustand state management
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
├── assets/            # Static resources
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── android/           # Native Android code
```

---

## AI Integration

### Models Used

**Whisper Large V3 Turbo**  
Voice transcription with multi-language support (English, Hindi, Hinglish). Latency: 2-5 seconds.

**LLaMA 3.3 70B Versatile**  
Used for food parsing, coaching, and report generation. Latency: 1-5 seconds depending on task.

### API Configuration

All AI features are powered by Groq API. The integration handles:
- Automatic retry logic
- Rate limiting
- Error handling
- Request queuing

---

## Database

### Schema

The app uses SQLite with Drizzle ORM for type-safe database operations.

**Core Tables:**
- `users` - User profiles and settings
- `nutrition_logs` - Food entries with macros
- `workout_logs` - Workout sessions
- `exercises` - Exercise definitions
- `sets` - Individual exercise sets
- `coach_messages` - AI chat history
- `reports` - Generated reports

### Migrations

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

---

## Development

### Common Commands

```bash
# Development
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Database
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations

# Type Checking
npm run type-check     # TypeScript validation

# Utilities
node scripts/run-seed.js              # Seed database
node scripts/check-model-access.js    # Verify API access
```

### Type Safety

The entire codebase is written in TypeScript with strict mode enabled. Run type checking with:

```bash
npx tsc --noEmit --skipLibCheck
```

---

## Troubleshooting

### API Key Issues

**Problem:** "API key not configured"

**Solution:**
1. Verify `.env` file exists in root directory
2. Ensure `GROQ_API_KEY` is set correctly
3. Restart the development server

### Rate Limiting

**Problem:** "Rate limit exceeded"

**Solution:**
- Wait 60 seconds before retrying
- Check for infinite loops in API calls
- Monitor usage at https://console.groq.com

### Voice Input

**Problem:** Voice transcription not working

**Solution:**
- Grant microphone permissions in device settings
- Verify audio format is supported (m4a)
- Check Groq API key is valid

### Build Errors

**Problem:** Android build fails

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm start
```

See [Issues & Fixes](docs/ISSUES_AND_FIXES.md) for comprehensive troubleshooting.

---

## Documentation

- **[Groq Quick Start](docs/GROQ_QUICK_START.md)** - Get AI features working in 3 steps
- **[Issues & Fixes](docs/ISSUES_AND_FIXES.md)** - Troubleshooting guide
- **[Setup](docs/setup/)** - Setup and configuration guides
- **[Guides](docs/guides/)** - User and development guides
- **[Development](docs/development/)** - Technical documentation
- **[Troubleshooting](docs/troubleshooting/)** - Problem solutions
- **[Archive](docs/archive/)** - Historical documentation

---

## Architecture

### State Management

Zustand stores handle application state with Immer for immutable updates:

```typescript
nutrition-store  → Food logs and daily totals
workout-store    → Workout sessions and exercises
user-store       → User preferences and settings
coach-store      → AI chat messages and history
```

### Data Flow

```
User Input → UI Component → Zustand Store → SQLite Database
                ↓
           Groq AI API (for AI features)
```

### Navigation

File-based routing with Expo Router:
- Automatic route generation from file structure
- Type-safe navigation
- Deep linking support

---

## Design System

**Colors:** Dark theme with green accent colors  
**Typography:** Bebas Neue (headers), DM Sans (body text)  
**Components:** Custom UI library in `components/ui/`  
**Styling:** NativeWind (Tailwind CSS for React Native)  
**Spacing:** Consistent 4px grid system

---

## Performance

### Optimizations

- Lazy loading for route screens
- Memoization for expensive calculations
- Virtual lists for long content
- Image optimization
- Bundle size monitoring

### Metrics

- App launch time: < 2 seconds
- Voice transcription: 2-5 seconds
- Food parsing: 1-3 seconds
- Database queries: < 100ms

---

## Platform Support

**iOS:** 13.0 and above  
**Android:** API 26 (Android 8.0) and above

Tested on various device sizes and configurations.

---

## Production Build

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform ios
eas build --platform android
```

See [EAS Setup](docs/EAS_SETUP_COMPLETE.md) for detailed configuration.

---

## Experimental Features

The following features are currently in development or experimental stage:

| Feature | Status | Notes |
|---------|--------|-------|
| Smart Reports | Experimental | Weekly/monthly AI summaries - may require refinement |
| Workout Templates | Experimental | Pre-built workout plans - under development |
| Barcode Scanner | Experimental | Food barcode scanning - limited database |
| PDF Export | Experimental | Report export to PDF - formatting in progress |

These features may have incomplete functionality or require additional setup. Use with caution in production.

---

## Contributing

This is currently a personal project. Issues and feedback are welcome.

---

## License

Private project - All rights reserved

---

## Support

- **Documentation:** See `docs/` directory
- **Groq API Docs:** https://console.groq.com/docs
- **Expo Docs:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev

---

**Built with React Native, Expo, and Groq AI**
