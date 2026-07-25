# How to Load Seed Data

## The Problem
The app is showing empty states because the database has no data yet. The seed script I created needs to be **executed** to populate the database.

## Solution: Load the Dummy Data

### Method 1: Using the App (Recommended)

1. **Start the app** (if not already running):
   ```bash
   cd "c:\Users\chava\Desktop\Nutrition OS\apex"
   npm start
   ```

2. **Open the app** on your device/emulator

3. **Navigate to More tab**:
   - Look at the bottom navigation bar
   - Tap the rightmost icon (three dots or "More")

4. **Scroll down** to the "Developer Tools" section

5. **Tap "Add Dummy Data"** button:
   - A confirmation dialog will appear
   - Tap "Add Data" to confirm
   - Wait for the success message

6. **Navigate back** to other tabs:
   - Home tab should now show nutrition and workout data
   - Nutrition tab should show food logs
   - Workout tab should show workout sessions
   - Progress tab should show body stats
   - Coach tab can now reference actual data

### Method 2: Using Expo Dev Tools Console

1. **Open Expo Dev Tools** (press `d` in the terminal where npm start is running)

2. **Open the Console** tab

3. **Run this command**:
   ```javascript
   import('./lib/db/seed-dummy-data').then(m => m.addDummyWeekData())
   ```

4. **Wait for completion** - you'll see console logs showing progress

### Method 3: Add Temporary Button to Home Screen

If you want a more visible button, I can add one to the home screen. Let me know!

## What Gets Loaded

Once you run the seed script, you'll get:

- ✅ **7 days of weight logs** (daily weigh-ins)
- ✅ **1 InBody scan** (full body composition)
- ✅ **70 supplement logs** (10 supplements × 7 days)
- ✅ **8 personal records** (PRs for key exercises)
- ✅ **7 days of nutrition logs** (breakfast, lunch, snack, dinner)
- ✅ **7 workout sessions** (full PPL x2 split)
- ✅ **7 recovery logs** (sleep, HRV, soreness)

## Verify It Worked

After loading data, check:

1. **Home tab**: Should show today's nutrition progress and workout badge
2. **Nutrition tab**: Should show food logs for the week
3. **Workout tab**: Should show workout sessions
4. **Progress tab**: Should show weight chart and body stats
5. **Coach tab**: Ask "what's today's game plan" - should reference actual data

## Troubleshooting

### If the button doesn't appear:
- Make sure you're on the latest code (pull/refresh)
- Check the More tab carefully - it's in the "Developer Tools" section
- Try restarting the app

### If you get an error:
- Check the console logs for details
- Make sure the database is initialized
- Try clearing app data and restarting

### If data doesn't show up:
- Try pulling down to refresh on each tab
- Restart the app
- Check if the seed script completed successfully (look for "🎉 Comprehensive dummy data added successfully!" in console)

## Need Help?

If you're still having issues, let me know and I can:
1. Add a more visible seed button to the home screen
2. Create a different seeding method
3. Debug why the current method isn't working
