# Post-Migration Checklist

Use this checklist to verify the Groq migration is complete and working correctly.

---

## ✅ Pre-Flight Checks

### Environment Setup
- [ ] `.env` file exists in project root
- [ ] `GROQ_API_KEY` is set in `.env`
- [ ] API key starts with `gsk_`
- [ ] `.env` is in `.gitignore`
- [ ] Dev server restarted after adding key

### Dependencies
- [ ] `groq-sdk` is in `package.json` dependencies
- [ ] `npm install` completed successfully
- [ ] No dependency conflicts

### File Structure
- [ ] `/lib/groq/` directory exists
- [ ] `/lib/groq/client.ts` exists
- [ ] `/lib/groq/index.ts` exists
- [ ] All 9 Groq files created (see MIGRATION_SUMMARY.md)

---

## 🧪 Functional Testing

### 1. Voice Input (Transcription + Food Parsing)

**Test Steps:**
1. Open app
2. Navigate to Nutrition tab
3. Tap microphone icon
4. Grant microphone permission if prompted
5. Record: "4 eggs and 2 rotis"
6. Wait for transcription
7. Verify food items appear
8. Check macros are reasonable

**Expected Results:**
- [ ] Transcription appears within 5 seconds
- [ ] Food items parsed correctly
- [ ] Macros are reasonable (eggs ~280 kcal, rotis ~160 kcal)
- [ ] Meal suggestion is "breakfast"
- [ ] Can save to database

**If Failed:**
- Check microphone permissions
- Verify audio format is m4a
- Check Groq API key is valid
- Review console logs for errors

---

### 2. Coach Chat

**Test Steps:**
1. Navigate to Coach tab
2. Check status indicator (should be green "Groq API ready")
3. Type: "How did I do today?"
4. Send message
5. Wait for response

**Expected Results:**
- [ ] Status indicator is green
- [ ] Response appears within 5 seconds
- [ ] Response is contextual (mentions your actual data)
- [ ] Response is specific (includes numbers)
- [ ] Conversation history persists

**Test Suggested Prompts:**
- [ ] "Should I increase weight today?"
- [ ] "Am I on track for December?"
- [ ] "What's limiting my progress most?"

**If Failed:**
- Check Groq API key configuration
- Verify `isGroqConfigured()` returns true
- Check network connection
- Review console logs for errors

---

### 3. Monthly Report

**Test Steps:**
1. Navigate to Progress tab
2. Tap "Monthly Report" button
3. Tap "Generate Report"
4. Wait for generation (10-20 seconds)
5. Review report sections

**Expected Results:**
- [ ] Progress indicator shows status
- [ ] Report generates within 30 seconds
- [ ] Executive summary appears
- [ ] Overall score is 1-100
- [ ] Top 3 wins listed
- [ ] Top 3 areas to improve listed
- [ ] AI narrative is 400-600 words
- [ ] Next month plan has specific actions
- [ ] Report saves to database

**If Failed:**
- Check if you have data for the current month
- Verify Groq API key is valid
- Check rate limits (30 req/min)
- Review console logs for errors

---

### 4. Exercise Parsing

**Test Steps:**
1. Navigate to Workout tab
2. Start a workout session
3. Log exercise via text: "Bench press 3x10 at 60kg"
4. Verify parsing

**Expected Results:**
- [ ] Exercise name standardized ("Bench Press")
- [ ] Muscle group detected ("chest")
- [ ] Equipment detected ("barbell")
- [ ] Sets parsed correctly (3 sets)
- [ ] Reps parsed correctly (10 reps)
- [ ] Weight parsed correctly (60kg)

**If Failed:**
- Check input format
- Try more specific descriptions
- Review console logs for errors

---

### 5. InBody Parsing

**Test Steps:**
1. Navigate to Progress tab
2. Tap "InBody Paste" button
3. Paste sample InBody report text
4. Verify parsing

**Expected Results:**
- [ ] All metrics extracted
- [ ] Date parsed correctly
- [ ] Weight, body fat %, muscle mass extracted
- [ ] Segmental data extracted (if available)
- [ ] Missing fields listed
- [ ] Confidence level shown
- [ ] Can save to database

**If Failed:**
- Check InBody text format
- Verify all sections are included
- Review console logs for errors

---

## 🔍 Code Verification

### Import Statements

**Check these files have correct imports:**

- [ ] `app/(tabs)/coach.tsx` imports from `@/lib/groq`
- [ ] `app/modals/monthly-report.tsx` imports from `@/lib/groq`
- [ ] `app/modals/voice-input.tsx` imports from `@/lib/groq`
- [ ] `lib/ai/parsers.ts` imports from `../groq/*`

### No Old References

**Verify these are NOT imported anywhere:**

- [ ] No imports from `lib/ai/gemma.ts`
- [ ] No calls to `generateWithOllama()`
- [ ] No calls to `checkOllamaConnection()`
- [ ] No references to `ollamaUrl` in code

### Type Safety

**Run TypeScript check:**

```bash
npx tsc --noEmit --skipLibCheck
```

- [ ] No errors in `/lib/groq/` files
- [ ] No errors in updated files
- [ ] All types properly exported

---

## 📊 Performance Testing

### Latency Benchmarks

**Measure and record:**

- [ ] Voice transcription: _____ seconds (target: 2-5s)
- [ ] Food parsing: _____ seconds (target: 1-3s)
- [ ] Exercise parsing: _____ seconds (target: 1-3s)
- [ ] Coach response: _____ seconds (target: 2-5s)
- [ ] Monthly report: _____ seconds (target: 10-20s)

**If Slower Than Expected:**
- Check network speed
- Verify Groq API status
- Check for rate limiting
- Review request payload size

---

## 🔒 Security Verification

### API Key Security

- [ ] API key is in `.env` file
- [ ] `.env` is in `.gitignore`
- [ ] API key is NOT in source code
- [ ] API key is NOT in git history
- [ ] API key is NOT in screenshots/docs

### Error Messages

- [ ] Error messages don't expose API key
- [ ] Error messages are user-friendly
- [ ] Errors are logged to console (not shown to user)

---

## 📱 Device Testing

### iOS Testing

- [ ] Voice input works on iOS
- [ ] Coach chat works on iOS
- [ ] Monthly report works on iOS
- [ ] No crashes or freezes
- [ ] Performance is acceptable

### Android Testing

- [ ] Voice input works on Android
- [ ] Coach chat works on Android
- [ ] Monthly report works on Android
- [ ] No crashes or freezes
- [ ] Performance is acceptable

---

## 🚨 Error Handling

### Test Error Scenarios

**1. No API Key:**
- [ ] Remove API key from `.env`
- [ ] Restart app
- [ ] Verify error message: "API key not configured"
- [ ] Verify features are disabled gracefully

**2. Invalid API Key:**
- [ ] Set invalid API key in `.env`
- [ ] Restart app
- [ ] Try voice input
- [ ] Verify error message: "API authentication failed"

**3. Rate Limit:**
- [ ] Make 30+ requests in 1 minute
- [ ] Verify error message: "Rate limit exceeded"
- [ ] Verify retry suggestion shown

**4. Network Offline:**
- [ ] Turn off WiFi/data
- [ ] Try voice input
- [ ] Verify error message: "Network error"
- [ ] Turn on WiFi/data
- [ ] Verify features work again

---

## 📝 Documentation Review

### Documentation Files

- [ ] `GROQ_QUICK_START.md` exists
- [ ] `MIGRATION_SUMMARY.md` exists
- [ ] `GROQ_MIGRATION_COMPLETE.md` exists
- [ ] `POST_MIGRATION_CHECKLIST.md` exists (this file)

### Code Comments

- [ ] All Groq functions have JSDoc comments
- [ ] Complex logic is explained
- [ ] Type definitions are documented

---

## 🎯 User Acceptance Testing

### User Experience

- [ ] Voice input is intuitive
- [ ] Coach chat feels natural
- [ ] Monthly report is insightful
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Performance feels fast

### Data Quality

- [ ] Food parsing is accurate
- [ ] Exercise parsing is accurate
- [ ] Coach responses are relevant
- [ ] Monthly reports are insightful
- [ ] InBody parsing is complete

---

## 🔄 Rollback Plan (If Needed)

If migration fails, you can rollback:

### Option 1: Revert Git Commits

```bash
git log --oneline  # Find commit before migration
git revert <commit-hash>
```

### Option 2: Keep Both Systems

- Keep old `lib/ai/gemma.ts` file
- Add feature flag to switch between Groq and Ollama
- Gradually migrate users

### Option 3: Fix Forward

- Review error logs
- Check Groq console for API issues
- Verify environment configuration
- Test individual functions

---

## ✅ Final Sign-Off

### Migration Complete When:

- [ ] All functional tests pass
- [ ] All error scenarios handled
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] Code is clean and commented
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] User experience is smooth

### Sign-Off

- **Tested By:** _________________
- **Date:** _________________
- **Status:** ☐ Pass ☐ Fail ☐ Needs Work
- **Notes:** _________________

---

## 🎉 Congratulations!

If all checks pass, your Groq migration is complete and production-ready!

**Next Steps:**
1. Monitor API usage in Groq console
2. Gather user feedback
3. Optimize based on usage patterns
4. Consider implementing caching
5. Plan for production deployment

---

**Need Help?**
- Review `GROQ_QUICK_START.md` for common issues
- Check `MIGRATION_SUMMARY.md` for technical details
- Visit https://console.groq.com/docs for API docs
