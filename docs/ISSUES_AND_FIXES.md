# Issues Found and Fixes

## Issue 1: ✅ Keyboard Covering Text Input in Coach

**Problem:** When typing in coach, keyboard covers the input field on Android.

**Fix Applied:** Changed `KeyboardAvoidingView` behavior from `"height"` to `undefined` for Android.

**File:** `app/(tabs)/coach.tsx`

```typescript
// Before
behavior={Platform.OS === "ios" ? "padding" : "height"}

// After  
behavior={Platform.OS === "ios" ? "padding" : undefined}
```

---

## Issue 2: ❌ Coach Can't Modify Workout Plans

**Problem:** Coach says "I can't add cable pullovers to your plan" because the coach doesn't have access to modify workout templates or plans.

**Why:** The coach context only includes:
- Nutrition data (last 7 days, last 30 days)
- Recent workouts (completed sessions)
- PRs
- Body stats
- Recovery logs

**What's Missing:**
- Workout templates
- Exercise library
- Ability to modify plans
- Ability to create/update workout sessions

**Solution Options:**

### Option A: Tell User to Add Manually
Coach should respond: "I can see you want to add cable pullovers to your pull day. Here's how:
1. Go to Workout tab
2. Start your Pull A session
3. Add cable pullovers as an exercise
4. I'll track your progress from there"

### Option B: Add Workout Planning Tools (Future Feature)
Would require:
- New database tables for workout templates
- Exercise library with categories
- Coach functions to modify templates
- UI to review/approve coach suggestions

**Current Recommendation:** Option A - Coach guides user to add exercises manually.

---

## Issue 3: ✅ FIXED - Coach System Prompt Now Dynamically Injects Today's Date and Training Type

**Problem:** Coach was telling users the wrong training day (e.g., saying "Pull A" on Sundays when it should be "Marathon"). The system prompt had no awareness of what day it actually is, leading to incorrect or generic advice.

**Root Cause:** The system prompt in `generateCoachResponse.ts` was static and didn't include today's date, day name, or training type. The coach couldn't answer "what's today's game plan" accurately because it didn't know what day it was.

**Solution:** 
1. Created `getTodayTrainingType()` function that dynamically calculates:
   - Today's date (e.g., "May 10, 2026")
   - Today's day name (e.g., "Sunday")
   - Today's training type based on PPL x2 schedule (e.g., "Marathon (Cardio/Recovery)")

2. Updated system prompt to inject these values at the start of every conversation:
   ```
   TODAY'S DATE: May 10, 2026
   TODAY'S DAY: Sunday
   TODAY'S TRAINING: Marathon (Cardio/Recovery)
   ```

3. Enhanced coach persona to be brutally honest and data-driven:
   - No fluff, no generic advice, no motivational platitudes
   - Always references actual logged data (specific numbers, dates, patterns)
   - Calls out gaps proactively (protein deficits, missed supplements, stalled lifts)
   - Explains mechanisms, not just recommendations
   - Direct about what's holding the user back

4. Added explicit training schedule to system prompt so coach knows the full PPL x2 split

**Files Modified:**
- `lib/groq/generateCoachResponse.ts`

**Result:** 
- Coach now always knows what day it is and responds accordingly
- When user asks "what's today's game plan", coach answers specifically for today's scheduled training
- No more stale or incorrect day references
- Coach persona is now brutally honest and always references actual user data

---

## Issue 4: ✅ FIXED - Comprehensive Preloaded Data Added

**Problem:** App had minimal or no preloaded data, making it hard to test features and see how the app looks with real usage patterns. Users needed sample data for nutrition logs, workout sessions, recovery logs, body stats, supplement adherence, and personal records.

**Solution:** Enhanced the seed script (`lib/db/seed-dummy-data.ts`) to populate ALL data types:

### Data Added:
1. **Body Stats** (7 days)
   - Daily weight logs with realistic fluctuations (±0.2kg)
   - 1 InBody scan (April 9, 2026) with full body composition data
   - Segmental muscle and fat measurements

2. **Supplement Logs** (7 days × 10 supplements = 70 logs)
   - Daily adherence tracking for all supplements from USER_PROFILE
   - 85% adherence rate (realistic missed doses)
   - Includes: Creatine, Whey Protein, Ashwagandha, Vitamin D3+K2, Zinc, Copper, Omega-3, Magnesium, Brahmi, Saw Palmetto

3. **Personal Records** (8 PRs)
   - Bench Press: 85kg × 8 reps
   - Deadlift: 125kg × 5 reps
   - Back Squat: 105kg × 8 reps
   - Overhead Press: 52.5kg × 8 reps
   - Barbell Row: 75kg × 8 reps
   - Romanian Deadlift: 85kg × 10 reps
   - Incline Dumbbell Press: 32.5kg × 10 reps
   - Pull-ups: 12 reps bodyweight
   - Each PR includes estimated 1RM, volume, and improvement percentage

4. **Nutrition Logs** (7 days)
   - Breakfast: Scrambled eggs, whole wheat toast, banana
   - Lunch: Grilled chicken, brown rice, mixed vegetables
   - Snack: Greek yogurt, almonds
   - Dinner: Salmon, sweet potato, broccoli
   - Daily summaries with macro totals and adherence scores
   - Targets based on USER_PROFILE (2500 cal, 155g protein)

5. **Workout Sessions** (7 days - full PPL x2 split)
   - Monday: Push A (Bench, Incline DB Press, OHP, Tricep Dips)
   - Tuesday: Pull A (Deadlift, Pull-ups, Barbell Row, Bicep Curls)
   - Wednesday: Legs A (Back Squat, RDL, Leg Press, Calf Raises)
   - Thursday: Push B (Incline Barbell, DB Flyes, Lateral Raises, Tricep Pushdowns)
   - Friday: Pull B (Lat Pulldown, Cable Row, Face Pulls, Hammer Curls)
   - Saturday: Legs B (Front Squat, Leg Curl, Bulgarian Split Squat, Leg Extension)
   - Sunday: Marathon (20min treadmill, 10min stretching)
   - Each session includes exercises, sets, reps, weight, RPE, and total volume

6. **Recovery Logs** (7 days)
   - Sleep duration (7-8.5 hours)
   - Sleep quality (3-5 rating)
   - HRV (50-80)
   - Resting HR (55-65 bpm)
   - Energy level, muscle soreness, stress level (all 1-5 scales)

### How to Use:
1. Go to **More** tab
2. Scroll to **Developer Tools**
3. Tap **Add Dummy Data**
4. Confirm the action
5. Data will be populated for the current week (Monday-Sunday)

**Files Modified:**
- `lib/db/seed-dummy-data.ts` - Enhanced with comprehensive data seeding
- Added imports for `bodyStats`, `supplementLogs`, `personalRecords`
- Added USER_PROFILE import for accurate targets

**Result:**
- App now has realistic, comprehensive data across all features
- Coach can reference actual logged data in responses
- Progress tab shows meaningful trends
- Nutrition and workout tabs are fully populated
- All features can be tested with realistic data

---

## Issue 5: ✅ FIXED - Home Page Shows "Pull A" Badge Without Workout

**Problem:** Home page shows "Pull A" (or other day type) badge in the top right corner even when no workout has been logged for today.

**Root Cause:** The badge was showing based on the calculated day type (from day of week) rather than only showing when an actual workout session exists.

**Solution:** Updated the home tab to only show the day type badge when there's an actual workout session logged:

```tsx
{/* Only show day type badge if there's an actual workout session logged */}
{session && todayDayType && (
  <View>
    <Text>{todayDayType}</Text>
  </View>
)}
```

**Files Modified:**
- `app/(tabs)/index.tsx`

**Result:**
- Badge only appears when you've actually logged a workout
- No more placeholder badges on days without workouts
- Cleaner home screen UI

---

## Issue 6: ✅ FIXED - Week Navigation Added to All Tabs

**Problem:** When seed data was added, it populated the previous week (Monday-Sunday), but there was no way to navigate back to view that data. Users could only see the current week.

**Solution:** Enhanced week navigation across all relevant tabs:

### Tabs with Week Navigation:

#### 1. **Nutrition Tab**
- Navigate day-by-day or jump weeks
- View food logs for any past week
- "Prev Week" / "Next Week" buttons
- "TODAY" button to return to current week

#### 2. **Workout Tab**  
- View workout sessions from any week
- Navigate through training history
- Same week navigation controls

#### 3. **Progress Tab** ✨ NEW
- **Body section**: View weekly weight trends
- **Strength section**: See PRs achieved in specific weeks
- **Nutrition section**: Weekly nutrition summaries and averages
- **Recovery section**: Weekly sleep and recovery trends
- All sections filter data by selected week

### New Features:
1. **Week Navigation Buttons** - "Prev Week" and "Next Week" buttons appear when viewing past weeks
2. **Week Indicator** - Shows "Week of [date]" when not on current week
3. **Dynamic Week Display** - All data filters to show only the selected week
4. **Seamless Navigation** - Can navigate day-by-day or jump weeks
5. **Context-Aware Labels** - Shows "THIS WEEK" vs "WEEK" based on selection

### How It Works:
- When you're on the current week: Only "THIS WEEK" label shows
- When you navigate to a past week: Week navigation buttons appear
- Click "Prev Week" or "Next Week" to jump 7 days at a time
- Click "THIS WEEK" button to instantly return to current week
- All data automatically filters to show only the selected week's data

**Files Modified:**
- `components/ui/DateNavigator.tsx` - Added week navigation to date picker
- `app/(tabs)/progress.tsx` - Added week filtering and navigation

**Result:**
- Can now view all historical data week by week across all tabs
- Easy navigation between weeks
- Clear indication of which week you're viewing
- Data automatically filters to selected week
- Consistent navigation experience across the app

---

## Issue 7: ✅ FIXED - Macro Bar Colors - Protein and Fat Show Same Color

**Problem:** In the home tab macro bars (horizontal bars), protein and fat were both showing yellow color instead of protein being blue and fat being orange.

**Root Cause:** The MacroBar component was changing BOTH the number color AND the bar color to yellow (#FFB800) when the value exceeded the target. Since the seed data has protein at 174g (target: 155g) and fat at 68g (target: 65g), both were showing yellow.

**Solution:** Updated MacroBar to only change the NUMBER color when over target, but keep the BAR color as the designated macro color:
- **Protein bar**: Always blue (#3B82F6)
- **Carbs bar**: Always green (#22C55E)
- **Fat bar**: Always orange (#F59E0B)
- **Numbers**: Turn yellow when over target (visual warning)

**Files Modified:**
- `components/ui/MacroBar.tsx`

**Result:**
- Macro bars now show their correct colors consistently
- Blue for protein, green for carbs, orange for fat
- Numbers still turn yellow when over target (good visual feedback)
- Matches the macro ring colors

---

## Issue 8: ❌ Home Page Shows "Pull A" on Sunday

**Problem:** Home page shows "Pull A" in top right corner even though today is Sunday (should be rest/Marathon day).

**Root Cause:** The code checks for existing workout sessions in the database and displays that day type, even if it's from a previous session or incorrect.

**File:** `app/(tabs)/index.tsx`

**Current Logic:**
```typescript
const getTodayDayType = (): string => {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) return "Marathon"; // Sunday
  return "";
};

// But then it gets overridden if a session exists:
if (sessionsData[0]) {
  setSession(sessionsData[0]);
  setTodayDayType(sessionsData[0].day_type); // ← This overrides Sunday = Marathon
}
```

**Fix Needed:**
```typescript
// Don't override Sunday with session data
if (sessionsData[0]) {
  setSession(sessionsData[0]);
  // Only set day type from session if it's not Sunday
  if (new Date().getDay() !== 0) {
    setTodayDayType(sessionsData[0].day_type);
  }
} else {
  setTodayDayType(getTodayDayType());
}
```

---

## Issue 4: ❌ Session/Workout Data Still Showing

**Problem:** You mentioned removing session-related features, but they're still showing on the home page.

**What's Still Showing:**
1. Day type badge (Pull A, Push B, etc.) in top right
2. "TODAY'S WORKOUT" card
3. Workout volume stats
4. Session completion status

**Questions to Clarify:**

### Do you want to:

**A. Keep workout tracking but fix the Sunday issue?**
- Keep all workout features
- Just fix Sunday showing wrong day type
- Keep session tracking

**B. Remove all workout/session features from home page?**
- Remove day type badge
- Remove "TODAY'S WORKOUT" card
- Remove volume stats
- Keep only nutrition tracking on home

**C. Simplify workout display?**
- Show only if user manually starts a workout
- Don't auto-suggest day types
- Don't show "Pull A" badges

---

## Summary of What I Fixed

### ✅ Fixed
1. **Keyboard issue in Coach** - Changed KeyboardAvoidingView behavior

### ❌ Needs Your Decision

2. **Coach workout planning** - Should coach guide users to add exercises manually, or do you want full workout planning features?

3. **Sunday showing "Pull A"** - Should I:
   - Fix to always show "Marathon" on Sunday?
   - Remove day type badges entirely?
   - Only show day type when user starts a workout?

4. **Session data on home page** - Should I:
   - Keep it but fix the bugs?
   - Remove it entirely?
   - Simplify it?

---

## Recommended Fixes

### Quick Fix (5 minutes):
1. ✅ Keyboard issue - DONE
2. Fix Sunday logic - Don't override with session data
3. Update coach prompt to guide users to add exercises manually

### Medium Fix (30 minutes):
1. All quick fixes
2. Remove day type badge from home page
3. Simplify workout card to only show if session is active
4. Update coach to be more helpful about workout planning

### Full Redesign (2+ hours):
1. Add workout template system
2. Add exercise library
3. Give coach ability to suggest workouts
4. Add approval flow for coach suggestions

---

## What Do You Want Me to Do?

Please tell me:

1. **For the Sunday/"Pull A" issue:**
   - [ ] Fix to always show "Marathon" on Sunday
   - [ ] Remove day type badges entirely
   - [ ] Only show when workout is active

2. **For workout/session data on home:**
   - [ ] Keep it, just fix bugs
   - [ ] Remove it entirely
   - [ ] Simplify it (show only when active)

3. **For coach workout planning:**
   - [ ] Coach guides user to add manually (quick)
   - [ ] Add full workout planning features (long)

Let me know and I'll implement your choice!
