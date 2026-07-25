# Seed Data Guide

## Overview
The app includes a comprehensive seed script that populates ALL data types with realistic sample data for testing and demonstration purposes.

## What Gets Seeded

### 1. Body Stats (8 entries)
- **7 daily weight logs** (current week)
  - Base weight: 75.0 kg
  - Daily fluctuation: ±0.2 kg (realistic variation)
  - Source: Manual entry
  
- **1 InBody scan** (April 9, 2026)
  - Weight: 75.0 kg
  - Body fat: 34.9%
  - Skeletal muscle: 27.2 kg
  - InBody score: 58
  - Full segmental analysis (arms, trunk, legs)
  - Source: InBody paste

### 2. Supplement Logs (70 entries)
- **7 days × 10 supplements**
- Supplements tracked:
  1. Creatine Monohydrate (5g daily)
  2. Whey Protein (1 scoop post-workout)
  3. Ashwagandha (2 tablets nightly)
  4. Vitamin D3 + K2 MK-7
  5. Zinc Bisglycinate
  6. Copper Glycinate
  7. Omega-3
  8. Magnesium Glycinate
  9. Brahmi/Bacopa
  10. Saw Palmetto 320mg
- **85% adherence rate** (realistic missed doses)

### 3. Personal Records (8 PRs)
| Exercise | Weight | Reps | Est. 1RM | Date |
|----------|--------|------|----------|------|
| Bench Press | 85 kg | 8 | 107.7 kg | May 5 |
| Deadlift | 125 kg | 5 | 145.8 kg | May 6 |
| Back Squat | 105 kg | 8 | 133.0 kg | May 7 |
| Overhead Press | 52.5 kg | 8 | 66.5 kg | May 5 |
| Barbell Row | 75 kg | 8 | 95.0 kg | May 6 |
| Romanian Deadlift | 85 kg | 10 | 113.3 kg | May 7 |
| Incline DB Press | 32.5 kg | 10 | 43.3 kg | May 8 |
| Pull-ups | 0 kg | 12 | - | May 9 |

Each PR includes:
- Best weight and reps
- Estimated 1RM (Epley formula)
- Best volume (weight × reps)
- Previous best and improvement %

### 4. Nutrition Logs (7 days)

**Daily Meal Plan:**
- **Breakfast**: Scrambled eggs (200g), whole wheat toast (60g), banana (120g)
- **Lunch**: Grilled chicken (200g), brown rice (150g), mixed vegetables (150g)
- **Snack**: Greek yogurt (200g), almonds (30g)
- **Dinner**: Salmon fillet (180g), sweet potato (200g), broccoli (150g)

**Daily Totals:**
- Calories: ~2,300 kcal
- Protein: ~175g
- Carbs: ~220g
- Fat: ~70g

**Targets (from USER_PROFILE):**
- Calories: 2,500 kcal
- Protein: 155g
- Carbs: 240g
- Fat: 65g

### 5. Workout Sessions (7 days - PPL x2)

**Monday - Push A:**
- Bench Press: 3×8 @ 80kg
- Incline DB Press: 3×10 @ 30kg
- Overhead Press: 3×8 @ 50kg
- Tricep Dips: 3×12 bodyweight

**Tuesday - Pull A:**
- Deadlift: 3×5 @ 120kg
- Pull-ups: 3×10 bodyweight
- Barbell Row: 3×8 @ 70kg
- Bicep Curls: 3×12 @ 15kg

**Wednesday - Legs A:**
- Back Squat: 3×8 @ 100kg
- Romanian Deadlift: 3×10 @ 80kg
- Leg Press: 3×12 @ 150kg
- Calf Raises: 3×15 @ 60kg

**Thursday - Push B:**
- Incline Barbell Press: 3×8 @ 70kg
- Dumbbell Flyes: 3×12 @ 20kg
- Lateral Raises: 3×15 @ 12kg
- Tricep Pushdowns: 3×12 @ 30kg

**Friday - Pull B:**
- Lat Pulldown: 3×10 @ 60kg
- Cable Row: 3×10 @ 70kg
- Face Pulls: 3×15 @ 25kg
- Hammer Curls: 3×12 @ 15kg

**Saturday - Legs B:**
- Front Squat: 3×8 @ 80kg
- Leg Curl: 3×12 @ 50kg
- Bulgarian Split Squat: 3×10 @ 20kg
- Leg Extension: 3×15 @ 60kg

**Sunday - Marathon:**
- Treadmill Run: 20 minutes
- Stretching: 10 minutes

Each session includes:
- Duration: 30-60 minutes
- RPE: 5-7
- Total volume calculated
- All exercises, sets, reps, and weights logged

### 6. Recovery Logs (7 days)

**Daily metrics:**
- Sleep duration: 7-8.5 hours
- Sleep quality: 3-5 (out of 5)
- Bedtime: 23:00
- Wake time: 07:00
- HRV: 50-80
- Resting HR: 55-65 bpm
- Energy level: 3-5
- Muscle soreness: 2-4
- Stress level: 2-4

## How to Use

### From the App:
1. Open the app
2. Go to **More** tab
3. Scroll to **Developer Tools** section
4. Tap **Add Dummy Data**
5. Confirm the action
6. Wait for completion message

### Programmatically:
```typescript
import { addDummyWeekData } from './lib/db/seed-dummy-data';

// Call the function
await addDummyWeekData();
```

## What Happens

1. **Checks for existing data** - Skips dates that already have nutrition data
2. **Seeds in order:**
   - Body stats (weight logs + InBody)
   - Supplement logs (all supplements for all days)
   - Personal records (8 key exercises)
   - Daily data for each day:
     - Food logs (breakfast, lunch, snack, dinner)
     - Daily nutrition summary
     - Workout session with exercises and sets
     - Recovery log

3. **Console output** shows progress for each step

## Data Characteristics

- **Realistic values** based on USER_PROFILE
- **Consistent with training split** (PPL x2)
- **Progressive overload** visible in PRs
- **Natural variation** in weight, sleep, HRV
- **High but not perfect adherence** (85% supplements)
- **Balanced nutrition** hitting most targets

## Use Cases

1. **Testing features** - All tabs have data to display
2. **Coach AI** - Can reference actual logged data
3. **Progress tracking** - Shows trends over time
4. **Demo/screenshots** - App looks populated
5. **Development** - No need to manually log data

## Notes

- Data is for the **current week** (Monday-Sunday)
- Running multiple times will skip existing dates
- InBody scan is dated April 9, 2026 (separate from weekly data)
- All timestamps use current time
- UUIDs are generated for all entries

## Files

- **Seed script**: `lib/db/seed-dummy-data.ts`
- **Utility wrapper**: `lib/utils/add-dummy-data.ts`
- **Standalone script**: `scripts/add-dummy-week-data.ts`
- **UI trigger**: `app/(tabs)/more.tsx` (Developer Tools section)
