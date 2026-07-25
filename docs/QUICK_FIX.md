# Quick Fix for Current Errors

## Issues Found

1. ✅ **GROQ_API_KEY Error** - Fixed by making client initialization lazy
2. ✅ **Missing default exports** - All files have exports (cache issue)

## Solution

### Step 1: Clear Metro Cache

```bash
# Stop the dev server (Ctrl+C)

# Clear cache
npx expo start --clear

# Or on Windows:
npm start -- --clear
```

### Step 2: Create .env File

```bash
# Copy the example
copy .env.example .env

# Edit .env and add your Groq API key:
GROQ_API_KEY=gsk_your_actual_key_here
```

### Step 3: Restart Dev Server

```bash
npm start
```

## What Was Fixed

### 1. Groq Client Initialization

**Before:** Client was initialized at module load time (crashed if no API key)

**After:** Client is initialized lazily (only when actually used)

**File:** `lib/groq/client.ts`

```typescript
// Now uses lazy initialization
export function getGroq(): Groq {
  if (!groqInstance) {
    // Initialize only when needed
    groqInstance = new Groq({ apiKey, ... });
  }
  return groqInstance;
}
```

### 2. Metro Cache

The "missing default export" warnings are false positives from Metro's cache. Clearing the cache will resolve them.

## Verification

After clearing cache and restarting:

1. ✅ No GROQ_API_KEY errors (until you try to use AI features)
2. ✅ No "missing default export" warnings
3. ✅ App loads successfully
4. ✅ All screens accessible

## Using AI Features

Once you add your Groq API key to `.env`:

1. Voice input will work
2. Coach chat will work
3. Monthly reports will work
4. All AI features will work

Without the API key:
- App still works
- Non-AI features work fine
- AI features show "API key not configured" error

## Get Your Groq API Key

1. Go to https://console.groq.com
2. Sign up (free)
3. Navigate to API Keys
4. Create new key
5. Copy and paste into `.env`

---

**Quick Commands:**

```bash
# Clear cache and start
npx expo start --clear

# Or
npm start -- --clear
```

**That's it!** Your app should now run without errors.
