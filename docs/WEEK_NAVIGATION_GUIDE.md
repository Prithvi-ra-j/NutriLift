# Week Navigation Guide

## Overview
The app now supports full week-by-week navigation across all tabs, allowing you to view historical data from any past week.

## Where Week Navigation Works

### 1. Nutrition Tab
**What you can view:**
- Food logs for any day/week
- Daily nutrition summaries
- Macro breakdowns by meal

**How to navigate:**
1. Open Nutrition tab
2. Use left/right arrows to go day-by-day
3. When viewing a past week, use "Prev Week" / "Next Week" buttons
4. Click "TODAY" to return to current week

---

### 2. Workout Tab
**What you can view:**
- Workout sessions from any week
- Exercise logs with sets, reps, weights
- Training volume and RPE

**How to navigate:**
1. Open Workout tab
2. Same navigation as Nutrition tab
3. View complete workout history week by week

---

### 3. Progress Tab ✨ NEW
**What you can view by week:**

#### Body Section:
- Weekly weight trend chart (Mon-Sun)
- Start and end weight for the week
- Body composition changes
- InBody scan history (all-time)

#### Strength Section:
- Personal records achieved in that specific week
- PR details: weight, reps, estimated 1RM
- Improvement percentages

#### Nutrition Section:
- Weekly averages (calories, protein)
- Protein hit rate for the week
- Best and current streaks
- Protein gap analysis

#### Recovery Section:
- Weekly sleep trend chart
- Average sleep duration
- Average energy and soreness levels
- Day-by-day sleep quality

**How to navigate:**
1. Open Progress tab
2. Click "Prev Week" / "Next Week" buttons (appear when not on current week)
3. Click "THIS WEEK" to return to current week
4. All 4 sections automatically filter to selected week

---

## Navigation Controls

### When on Current Week:
```
┌─────────────────────────────────┐
│ PROGRESS          [THIS WEEK]   │ ← Button only shows when not current
│                                  │
│ [Body] [Strength] [Nutrition]   │
└─────────────────────────────────┘
```

### When on Past Week:
```
┌─────────────────────────────────────────┐
│ PROGRESS                  [THIS WEEK]   │
│                                          │
│ [Prev Week] Week of May 5 [Next Week]  │
│                                          │
│ [Body] [Strength] [Nutrition] [Recovery]│
└─────────────────────────────────────────┘
```

---

## Features

### Smart Filtering
- All data automatically filters to selected week
- Empty states show appropriate messages
- Labels change based on context ("THIS WEEK" vs "WEEK")

### Week Range
- Weeks run Monday to Sunday
- Week indicator shows Monday's date
- All data within that 7-day range is included

### Data Fetching
- Progress tab fetches 90 days of data
- Filters happen client-side for fast navigation
- No need to reload when switching weeks

---

## Use Cases

### 1. Compare Weekly Performance
Navigate between weeks to see:
- Weight changes week over week
- Nutrition consistency trends
- PR progression over time
- Recovery patterns

### 2. Review Past Training Blocks
Go back to specific weeks to:
- See what workouts you did
- Check nutrition adherence
- Review recovery quality
- Identify what worked

### 3. Track Long-Term Progress
Jump weeks to:
- Compare body composition monthly
- See strength gains over time
- Analyze nutrition patterns
- Spot recovery trends

---

## Tips

### Quick Navigation
- Use "Prev Week" / "Next Week" for fast jumping
- Use day arrows for fine-tuning
- "THIS WEEK" / "TODAY" buttons for instant return

### Data Availability
- Only weeks with logged data will show content
- Empty weeks show appropriate empty states
- InBody scans show regardless of week (all-time)

### Best Practices
- Log data consistently for better week comparisons
- Use week navigation to spot patterns
- Compare similar weeks (e.g., week 1 of each month)
- Track progress over 4-week blocks

---

## Technical Details

### Week Calculation
```typescript
const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { start: monday, end: sunday };
};
```

### Data Filtering
```typescript
const weekData = allData.filter(
  (item) => item.date >= weekRange.start && item.date <= weekRange.end
);
```

### State Management
- Selected date stored in component state
- Week range calculated from selected date
- All data filtered based on week range
- Navigation updates selected date

---

## Future Enhancements

Potential additions:
- Month view with week selection
- Year overview with monthly breakdown
- Custom date range selection
- Week comparison view (side-by-side)
- Export week data to PDF
- Share week summary

---

## Files Modified

- `components/ui/DateNavigator.tsx` - Week navigation for date picker
- `app/(tabs)/progress.tsx` - Week filtering and navigation
- `app/(tabs)/nutrition.tsx` - Already had date navigation
- `app/(tabs)/workout.tsx` - Already had date navigation

---

## Summary

Week navigation is now available across all major tabs:
- ✅ Nutrition tab - View food logs by week
- ✅ Workout tab - View training sessions by week
- ✅ Progress tab - View all metrics by week
- ✅ Consistent navigation experience
- ✅ Smart filtering and empty states
- ✅ Fast, client-side week switching
