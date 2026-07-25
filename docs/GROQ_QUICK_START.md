# Groq API Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Get Your API Key

1. Go to https://console.groq.com
2. Sign up for a free account
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy your key (starts with `gsk_...`)

### Step 2: Configure Environment

Create or update `.env` file in the project root:

```env
GROQ_API_KEY=gsk_your_actual_key_here
```

**Important**: Never commit this file to git!

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

---

## ✅ Verify It's Working

### Test 1: Voice Input

1. Open the app
2. Go to **Nutrition** tab
3. Tap the **microphone icon**
4. Record: "4 eggs and 2 rotis"
5. Should transcribe and parse food items

### Test 2: Coach Chat

1. Go to **Coach** tab
2. Type: "How did I do today?"
3. Should get a contextual response
4. Check for green "Groq API ready" indicator

### Test 3: Monthly Report

1. Go to **Progress** tab
2. Tap **Monthly Report**
3. Tap **Generate Report**
4. Should create comprehensive analysis

---

## 🎯 Usage Examples

### Food Parsing

```typescript
import { parseFoodFromText } from '@/lib/groq';

const result = await parseFoodFromText("2 eggs and a banana");
// Returns: { items: [...], meal_suggestion: "breakfast", ... }
```

### Exercise Parsing

```typescript
import { parseExerciseFromText } from '@/lib/groq';

const result = await parseExerciseFromText("Bench press 3x10 at 60kg");
// Returns: { exercises: [...], day_type_suggestion: "Push A", ... }
```

### Coach Response

```typescript
import { generateCoachResponse } from '@/lib/groq';

const response = await generateCoachResponse(
  context,
  [{ role: "user", content: "Should I increase weight?" }]
);
// Returns: "Based on your last 3 sessions hitting 3x12..."
```

### Weekly Report

```typescript
import { buildWeeklyContext, generateWeeklyReport } from '@/lib/groq';

const context = await buildWeeklyContext();
const report = await generateWeeklyReport(context);
// Returns: { summary, nutritionFeedback, whatWorked, ... }
```

---

## 🔧 Configuration Options

### Change Model (Advanced)

All functions use `llama-3.3-70b-versatile` by default. To use a different model, edit the function files in `/lib/groq/`.

Available models:
- `llama-3.3-70b-versatile` (default, best quality)
- `llama-3.1-8b-instant` (faster, lower quality)
- `mixtral-8x7b-32768` (alternative)

### Adjust Temperature

Lower = more consistent, Higher = more creative

```typescript
// In parseFood.ts, generateCoachResponse.ts, etc.
temperature: 0.1  // Very consistent (parsing)
temperature: 0.3  // Balanced (coach chat)
temperature: 0.7  // Creative (not recommended)
```

---

## 📊 API Usage Monitoring

### Check Your Usage

1. Go to https://console.groq.com
2. Click **Usage** in sidebar
3. View requests per day/minute

### Free Tier Limits

- **30 requests/minute**
- **14,400 requests/day**
- Resets daily at midnight UTC

### Optimize Usage

1. **Cache common results** (food items, exercise names)
2. **Debounce user input** (wait for user to finish typing)
3. **Batch requests** when possible
4. **Use local fallbacks** for simple queries

---

## 🐛 Common Issues

### Issue: "API key not configured"

**Solution**:
```bash
# 1. Check .env file exists
ls .env

# 2. Check key is set
cat .env | grep GROQ_API_KEY

# 3. Restart dev server
npm start
```

### Issue: "Rate limit exceeded"

**Solution**:
- Wait 60 seconds
- Check for infinite loops in code
- Implement request throttling

### Issue: "Network error"

**Solution**:
- Check internet connection
- Verify Groq API status: https://status.groq.com
- Try again in a few seconds

### Issue: Transcription fails

**Solution**:
- Ensure audio format is m4a (default for expo-audio)
- Check audio file size < 25MB
- Verify microphone permissions granted

### Issue: Parsing returns wrong results

**Solution**:
- Check input text format
- Try more specific descriptions
- Verify model is responding (check Groq console)

---

## 🎓 Best Practices

### 1. Error Handling

Always wrap Groq calls in try-catch:

```typescript
try {
  const result = await parseFoodFromText(input);
  // Use result
} catch (error) {
  console.error('Parsing failed:', error);
  // Show user-friendly error message
}
```

### 2. Loading States

Show loading indicators during API calls:

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleParse = async () => {
  setIsLoading(true);
  try {
    const result = await parseFoodFromText(input);
    // Handle result
  } finally {
    setIsLoading(false);
  }
};
```

### 3. User Feedback

Provide clear feedback on API status:

```typescript
// Good
"Transcribing your voice..."
"Analyzing your week..."
"Generating report (this may take 20 seconds)..."

// Bad
"Loading..."
"Please wait..."
```

### 4. Graceful Degradation

Provide fallbacks when API fails:

```typescript
const result = await parseFoodFromText(input).catch(() => ({
  items: [],
  meal_suggestion: null,
  parse_notes: "Could not parse automatically. Please enter manually."
}));
```

---

## 📱 Testing on Device

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

### Web (Limited)

```bash
npm run web
```

**Note**: Voice input requires native device (iOS/Android).

---

## 🔐 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] API key is not hardcoded in source files
- [ ] API key is not committed to git
- [ ] API key is not shared publicly
- [ ] Consider using backend proxy for production

---

## 📞 Support

### Groq Support
- Docs: https://console.groq.com/docs
- Discord: https://discord.gg/groq
- Email: support@groq.com

### Apex Support
- Check `MIGRATION_SUMMARY.md` for detailed info
- Check `GROQ_MIGRATION_COMPLETE.md` for technical details
- Review code comments in `/lib/groq/` files

---

## 🎉 You're All Set!

Your app is now powered by Groq's cloud AI. Enjoy:

- ✅ 10x faster inference
- ✅ Better accuracy
- ✅ Multilingual support
- ✅ No device performance impact

**Happy coding!** 🚀
