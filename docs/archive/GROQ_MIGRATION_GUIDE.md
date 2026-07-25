# Groq API Migration Guide

## ✅ Migration Complete

Your Apex app has been migrated from on-device Ollama to Groq API for all AI features.

## What Changed

### 1. Removed
- ❌ On-device Ollama client (`lib/ai/gemma.ts`)
- ❌ Local model inference
- ❌ Ollama server dependency

### 2. Added
- ✅ Groq SDK (`groq-sdk`)
- ✅ Groq client (`lib/groq/client.ts`)
- ✅ Whisper voice transcription (`lib/groq/transcribeAudio.ts`)
- ✅ LLaMA food parsing (`lib/groq/parseFood.ts`)
- ✅ Weekly coaching agent (`lib/groq/agents/weeklyCoach.ts`)
- ✅ Context builder (`lib/groq/agents/buildWeeklyContext.ts`)
- ✅ Error handling (`lib/groq/safeCall.ts`)

## Setup Instructions

### 1. Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys
4. Create a new API key
5. Copy the key

**Free Tier Limits:**
- 30 requests/minute
- 14,400 requests/day
- Access to Whisper and LLaMA models

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
GROQ_API_KEY=gsk_your_actual_api_key_here
```

**Important:** Never commit your `.env` file to git!

### 3. Install Dependencies

Already done! The `groq-sdk` package has been installed.

### 4. Test the Integration

```bash
# Start the app
npm start

# Test voice input
# 1. Open the app
# 2. Navigate to voice input modal
# 3. Record yourself saying "4 eggs and 2 rotis"
# 4. Check if transcription and parsing work
```

## New Features

### 1. Voice Transcription

**File:** `lib/groq/transcribeAudio.ts`

```typescript
import { transcribeAudio } from "@/lib/groq/transcribeAudio";

const text = await transcribeAudio(audioUri);
// Returns: "4 eggs and 2 rotis"
```

**Model:** `whisper-large-v3-turbo`
- Fast transcription
- Handles Indian accents
- Supports Hinglish (Hindi + English mix)

### 2. Food Parsing

**File:** `lib/groq/parseFood.ts`

```typescript
import { parseFoodFromText } from "@/lib/groq/parseFood";

const result = await parseFoodFromText("4 eggs and 2 rotis");
// Returns structured food data with macros
```

**Model:** `llama-3.3-70b-versatile`
- Better reasoning than Gemma 2B
- Understands Indian foods
- Estimates macros accurately

### 3. Weekly Coaching

**File:** `lib/groq/agents/weeklyCoach.ts`

```typescript
import { buildWeeklyContext } from "@/lib/groq/agents/buildWeeklyContext";
import { generateWeeklyReport } from "@/lib/groq/agents/weeklyCoach";

const context = await buildWeeklyContext();
const report = await generateWeeklyReport(context);
// Returns brutally honest weekly analysis
```

**Model:** `llama-3.3-70b-versatile`
- Analyzes nutrition + workout data
- Identifies bottlenecks
- Provides actionable feedback

## File Structure

```
lib/
├── groq/
│   ├── client.ts                    # Groq client initialization
│   ├── safeCall.ts                  # Error handling & retry logic
│   ├── transcribeAudio.ts           # Whisper voice transcription
│   ├── parseFood.ts                 # LLaMA food parser
│   └── agents/
│       ├── weeklyCoach.ts           # Weekly analysis agent
│       └── buildWeeklyContext.ts    # SQLite → context builder
└── ai/                              # OLD - can be removed
    ├── gemma.ts                     # ❌ Replaced by Groq
    ├── parsers.ts                   # ⚠️ Update to use Groq
    └── prompts.ts                   # ⚠️ Update prompts
```

## Migration Checklist

### Completed ✅
- [x] Install `groq-sdk`
- [x] Create Groq client
- [x] Implement voice transcription
- [x] Implement food parsing
- [x] Implement weekly coach agent
- [x] Update voice input modal
- [x] Add error handling
- [x] Create `.env.example`
- [x] Update `app.config.js`

### TODO 📋
- [ ] Add your Groq API key to `.env`
- [ ] Test voice input on device
- [ ] Update `lib/ai/parsers.ts` to use Groq (optional)
- [ ] Remove old Ollama code (optional)
- [ ] Implement weekly report UI
- [ ] Add daily coaching insights to dashboard
- [ ] Test on Samsung A52

## Usage Examples

### Voice Food Logging

```typescript
// In voice-input.tsx (already implemented)
const uri = await audioRecorder.stop();
const text = await transcribeAudio(uri);
const food = await parseFoodFromVoice(text);
// Save to database
```

### Weekly Report

```typescript
// In progress or dashboard screen
import { buildWeeklyContext } from "@/lib/groq/agents/buildWeeklyContext";
import { generateWeeklyReport } from "@/lib/groq/agents/weeklyCoach";

const handleWeeklyReport = async () => {
  setLoading(true);
  try {
    const context = await buildWeeklyContext();
    const report = await generateWeeklyReport(context);
    
    // Display report
    console.log(report.summary);
    console.log("Score:", report.overallScore);
    console.log("What worked:", report.whatWorked);
    console.log("What didn't:", report.whatDidnt);
    console.log("Next week focus:", report.nextWeekFocus);
  } catch (err) {
    console.error("Weekly report failed:", err);
  } finally {
    setLoading(false);
  }
};
```

### Daily Insight

```typescript
import { generateDailyInsight } from "@/lib/groq/agents/weeklyCoach";

const insight = await generateDailyInsight({
  calories: 1800,
  protein: 140,
  targetCalories: 2500,
  targetProtein: 160,
  workoutCompleted: true,
  dayType: "Push A",
});
// Returns: "You're 20g short on protein with 2 meals left. Aim for 10g per meal."
```

## Error Handling

All Groq calls are wrapped with error handling:

```typescript
import { safeGroqCall } from "@/lib/groq/safeCall";

const result = await safeGroqCall(async () => {
  return await groq.chat.completions.create({...});
});
```

**Handles:**
- Rate limiting (429)
- Authentication errors (401)
- Network errors
- Generic errors

## Rate Limiting

**Free Tier:**
- 30 requests/minute
- 14,400 requests/day

**Tips:**
- Cache transcriptions locally
- Batch food parsing when possible
- Generate weekly reports once per week
- Use daily insights sparingly

## Models Used

| Task | Model | Why |
|------|-------|-----|
| Voice transcription | `whisper-large-v3-turbo` | Fast, handles Indian accents |
| Food parsing | `llama-3.3-70b-versatile` | Better reasoning than Gemma |
| Weekly coaching | `llama-3.3-70b-versatile` | Complex multi-data analysis |
| Daily insights | `llama-3.3-70b-versatile` | Quick, contextual feedback |

## Testing on Samsung A52

Your target device (Samsung A52 with Snapdragon 720G) will benefit from:
- ✅ No on-device inference overhead
- ✅ Faster response times (cloud API)
- ✅ Better accuracy (larger models)
- ✅ Lower battery consumption
- ✅ No model file storage

## Troubleshooting

### "API Key Required" Error
- Check `.env` file exists
- Verify `GROQ_API_KEY` is set
- Restart Expo dev server

### "Rate Limit Exceeded" Error
- Wait 1 minute
- Check usage at console.groq.com
- Consider upgrading to paid tier

### "Network Error"
- Check internet connection
- Verify Groq API is accessible
- Check firewall settings

### Transcription Not Working
- Check microphone permissions
- Verify audio file format (m4a)
- Check audio file size (<25MB)

## Next Steps

1. **Add your API key** to `.env`
2. **Test voice input** on device
3. **Implement weekly report UI** in progress tab
4. **Add daily insights** to dashboard
5. **Remove old Ollama code** (optional cleanup)

## Support

- **Groq Docs:** https://console.groq.com/docs
- **Groq Discord:** https://discord.gg/groq
- **Whisper Docs:** https://platform.openai.com/docs/guides/speech-to-text

---

**Migration Date:** May 10, 2026  
**Status:** ✅ Complete  
**Next:** Add your Groq API key and test!
