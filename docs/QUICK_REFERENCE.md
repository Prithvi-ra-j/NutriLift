# Quick Reference Card

One-page reference for Apex development.

---

## 🚀 Quick Start (3 Steps)

```bash
# 1. Get Groq API key from https://console.groq.com
# 2. Add to .env file
echo "GROQ_API_KEY=gsk_your_key_here" > .env

# 3. Install and run
npm install
npm start
```

---

## 📁 Project Structure

```
apex/
├── app/              # Screens (Expo Router)
├── components/       # Reusable UI components
├── lib/
│   ├── groq/        # AI implementation (NEW)
│   ├── db/          # Database (SQLite + Drizzle)
│   ├── stores/      # State management (Zustand)
│   └── utils/       # Utilities
├── docs/            # Documentation
└── assets/          # Images, fonts
```

---

## 🤖 AI Features

### Voice Input
```typescript
import { transcribeAudio, parseFoodFromText } from '@/lib/groq';

const text = await transcribeAudio(audioUri);
const food = await parseFoodFromText(text);
```

### Coach Chat
```typescript
import { generateCoachResponse } from '@/lib/groq';

const response = await generateCoachResponse(context, messages);
```

### Monthly Report
```typescript
import { generateMonthlyReport } from '@/lib/groq';

const report = await generateMonthlyReport(userProfile, monthData);
```

---

## 📊 Database

### Query Data
```typescript
import { db } from '@/lib/db/client';
import { nutritionLogs } from '@/lib/db/schema';

const logs = await db.select().from(nutritionLogs);
```

### Insert Data
```typescript
await db.insert(nutritionLogs).values({
  id: uuid.v4(),
  date: '2026-05-10',
  meal: 'breakfast',
  // ...
});
```

---

## 🎨 Styling

### NativeWind (Tailwind)
```tsx
<View className="flex-1 bg-gray-900 p-4">
  <Text className="text-white text-xl font-bold">
    Hello World
  </Text>
</View>
```

### Custom Components
```tsx
import { Card } from '@/components/ui/Card';

<Card>
  <Text>Content</Text>
</Card>
```

---

## 🔧 Common Commands

```bash
# Development
npm start              # Start dev server
npm run ios           # Run on iOS
npm run android       # Run on Android

# Database
npm run db:generate   # Generate migrations
npm run db:migrate    # Apply migrations

# Type Check
npx tsc --noEmit --skipLibCheck
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [INDEX.md](INDEX.md) | Documentation navigation |
| [GROQ_QUICK_START.md](GROQ_QUICK_START.md) | AI setup guide |
| [README.md](README.md) | Full project docs |
| [POST_MIGRATION_CHECKLIST.md](POST_MIGRATION_CHECKLIST.md) | Testing guide |

---

## 🔑 Environment Variables

```env
# Required
GROQ_API_KEY=gsk_your_key_here
```

---

## 🐛 Troubleshooting

### "API key not configured"
```bash
# Check .env file
cat .env | grep GROQ_API_KEY

# Restart dev server
npm start
```

### "Rate limit exceeded"
- Wait 60 seconds
- Check for loops
- Monitor at https://console.groq.com

### Voice input fails
- Grant microphone permissions
- Check audio format (m4a)
- Verify API key

---

## 📱 App Screens

### Main Tabs
- **Home** - Dashboard with today's summary
- **Nutrition** - Food logging and tracking
- **Workout** - Exercise logging and PRs
- **Progress** - Body composition and reports
- **Coach** - AI chat assistant
- **More** - Settings and profile

### Modals
- Voice Input
- Barcode Scanner
- Log Food
- Log Exercise
- InBody Paste
- Monthly Report
- View Logs

---

## 🎯 Key Features

### Nutrition
- Manual food logging
- Voice input (AI transcription)
- Barcode scanning
- Macro tracking
- Meal planning

### Workout
- Exercise logging
- PR detection
- Volume tracking
- Progressive overload
- 6-day PPL split

### Progress
- Body weight tracking
- InBody integration
- Progress photos
- Weekly reports
- Monthly reports

### AI Coach
- Contextual advice
- Data-driven insights
- Brutally honest feedback
- Personalized recommendations

---

## 🔒 Security

### API Key
- Store in `.env` (not committed)
- Never hardcode in source
- Rotate regularly

### Data
- Local-first (SQLite)
- No cloud sync (yet)
- User data stays on device

---

## 📊 Performance

### AI Latency
- Voice transcription: 2-5s
- Food parsing: 1-3s
- Coach response: 2-5s
- Monthly report: 10-20s

### Rate Limits (Free)
- 30 requests/minute
- 14,400 requests/day

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| Database | SQLite + Drizzle ORM |
| Styling | NativeWind (Tailwind) |
| State | Zustand |
| AI | Groq (LLaMA 70B + Whisper) |
| Navigation | Expo Router |

---

## 📞 Support

- **Docs:** `/docs/INDEX.md`
- **Groq:** https://console.groq.com/docs
- **Expo:** https://docs.expo.dev

---

## ✅ Quick Checklist

### Setup
- [ ] Node.js 18+ installed
- [ ] Groq API key obtained
- [ ] `.env` file created
- [ ] Dependencies installed
- [ ] Dev server running

### Testing
- [ ] Voice input works
- [ ] Coach chat responds
- [ ] Food logging works
- [ ] Workout logging works
- [ ] Reports generate

### Development
- [ ] TypeScript compiles
- [ ] No console errors
- [ ] Features work on device
- [ ] Performance acceptable

---

**Last Updated:** May 10, 2026  
**Version:** 1.0.0 (Post Migration)
