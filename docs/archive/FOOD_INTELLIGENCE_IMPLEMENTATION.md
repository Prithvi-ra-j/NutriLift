# Food Intelligence Module - Implementation Guide

## Status: IN PROGRESS

This document tracks the implementation of the Barcode Scanning + Indian Food Database + Personal Library feature.

## Completed Steps

### ✅ Step 1-2: Database Schema
- Added `barcode_cache` table
- Added `personal_foods` table  
- Added `personal_foods_edit_history` table
- Updated migrations in `lib/db/client.ts`
- Added TypeScript types

### ✅ Step 3: Package Installation
- Installed `expo-camera`
- Installed `expo-barcode-scanner`

### ✅ Step 4: Scanner Screen Component
**File**: `app/modals/barcode-scanner.tsx` ✅
- Full-screen camera UI
- Animated reticle (green on lock, red on fail)
- Torch toggle button
- Manual barcode entry fallback
- Cancel button
- Permission handling
- Error states

### ✅ Step 5-6: API Services
**File**: `lib/services/barcodeScanner.ts` ✅
- Open Food Facts API integration
- Nutritionix fallback API
- Data validation (macro-calorie consistency)
- Missing field detection
- Physiologically impossible value detection
- Timeout handling (8 seconds)

### ✅ Step 7: Barcode Cache Layer
**File**: `lib/db/queries/barcode.ts` ✅
- Cache lookup function
- Cache save function
- Offline support
- Last used timestamp tracking
- Old cache cleanup function

### ✅ Step 8: Nutrition Card Confirm Screen
**File**: `app/modals/nutrition-card.tsx` ✅
- Shared by ALL input modes
- Editable fields (name, brand, macros)
- Quantity/serving adjustment
- Meal selection
- Data quality badges
- Warning displays
- Log to database

### ✅ Step 9: Add Scan Button
**File**: `app/(tabs)/nutrition.tsx` ✅
- Added 4th button (Scan) to existing row
- Routes to barcode scanner
- Updated app layout with new modals

## Phase 1 Complete! 🎉

**What Works Now:**
- ✅ Scan barcodes with camera
- ✅ Lookup nutrition from Open Food Facts
- ✅ Fallback to Nutritionix if OFF fails
- ✅ Validate data quality
- ✅ Cache results for offline use
- ✅ Show confirmation screen
- ✅ Edit values before logging
- ✅ Log to database

**Files Created:**
- `app/modals/barcode-scanner.tsx`
- `app/modals/nutrition-card.tsx`
- `lib/services/barcodeScanner.ts`
- `lib/db/queries/barcode.ts`
- `.env.example`

**Files Modified:**
- `lib/db/schema.ts` (added 3 tables)
- `lib/db/client.ts` (added migrations)
- `app/(tabs)/nutrition.tsx` (added Scan button)
- `app/_layout.tsx` (added modal routes)
- `.gitignore` (added .env)

## Next Phase: Indian Food Database

### 📋 Step 10: Indian Food Database
**File**: `lib/data/indianFoodDB.ts`
- 85-food IFCT 2017 database
- Bundled as local JSON
- Never requires network

### 📋 Step 11: Unified Search Function
**File**: `lib/services/foodSearch.ts`
- Search personal library (priority 1)
- Search Indian DB (priority 2)
- Search Open Food Facts (priority 3)
- Deduplication and ranking

### 📋 Step 12: Food Search Screen
**File**: `app/modals/food-search.tsx`
- Single search input
- Grouped results (My Foods | Indian | Packaged)
- Source badges
- Tap → Nutrition Card

### 📋 Step 13: Add Personal Food Screen
**File**: `app/modals/add-personal-food.tsx`
- All nutrition fields
- Serving size manager
- Duplicate warning
- Validation warnings
- Save button

### 📋 Step 14: Duplicate Detection
**File**: `lib/services/foodValidation.ts`
- Fuzzy matching (Levenshtein)
- Check against personal + Indian DB
- Show similar foods before save

### 📋 Step 15: Wire Existing Inputs Through Confirm Screen
**Files**: Multiple
- Update Type input → Nutrition Card
- Update Voice input → Nutrition Card
- Update Paste input → Nutrition Card

### 📋 Step 16: Data Quality Badges
**File**: `components/ui/DataQualityBadge.tsx`
- Verified badge (green)
- Partial badge (amber)
- Suspect badge (red)
- Estimated badge (blue)

### 📋 Step 17: Rice Raw/Cooked Disambiguation
**File**: `components/RiceCookedWarning.tsx`
- Modal for rice entries
- Force selection: raw or cooked
- Show conversion factor

### 📋 Step 18: Restaurant Food Variance Warning
**File**: `components/RestaurantWarning.tsx`
- Auto-add ±20% variance note
- Show on restaurant category foods

### 📋 Step 19: Test Offline Scenarios
- Indian DB works offline ✅ (local)
- Personal Library works offline ✅ (SQLite)
- Barcode cache works offline ✅ (SQLite)
- OFF/Nutritionix show "Requires connection"

### 📋 Step 20: Test API Failure Scenarios
- OFF timeout → Nutritionix fallback
- Both APIs fail → Manual entry
- Rate limit hit → Manual entry
- Network error → Cache check → Manual entry

## Architecture Overview

```
USER INPUT
├── Type (existing)
├── Voice (existing)
├── Paste (existing)
└── Scan (NEW)
    ↓
    Camera → Barcode Decode
    ↓
    Layer 1: Open Food Facts API
    ├── Hit + complete → Nutrition Card
    ├── Hit + incomplete → Nutrition Card + WARNING
    └── Miss → Layer fallback
    
SEARCH (all modes)
├── Layer 1: Open Food Facts (packaged)
├── Layer 2: Indian Food DB (local)
└── Layer 3: Personal Library (SQLite)
    ↓
    All results → CONFIRM SCREEN
    ↓
    Quantity/serving adjustment
    ↓
    LOG
```

## API Keys Needed

### Nutritionix (Free Tier: 500/day)
1. Register at: https://developer.nutritionix.com
2. Get APP_ID and APP_KEY
3. Add to `.env`:
```
NUTRITIONIX_APP_ID=your_app_id
NUTRITIONIX_APP_KEY=your_app_key
```

### Open Food Facts
- No API key needed
- Unlimited free tier
- Base URL: `https://world.openfoodfacts.org/api/v2/product`

## File Structure

```
lib/
├── services/
│   ├── barcodeScanner.ts (NEW - OFF + Nutritionix + cache)
│   ├── foodSearch.ts (NEW - unified search)
│   └── foodValidation.ts (NEW - validation rules)
├── data/
│   └── indianFoodDB.ts (NEW - 85-food database)
├── db/
│   ├── schema.ts (MODIFIED ✅)
│   ├── client.ts (MODIFIED ✅)
│   └── queries/
│       ├── barcode.ts (NEW)
│       └── personalFoods.ts (NEW)
app/
├── modals/
│   ├── barcode-scanner.tsx (NEW)
│   ├── nutrition-card.tsx (NEW)
│   ├── food-search.tsx (NEW)
│   └── add-personal-food.tsx (NEW)
└── (tabs)/
    └── nutrition.tsx (MODIFY - add Scan button)
components/
├── ui/
│   ├── DataQualityBadge.tsx (NEW)
│   └── MacroWarningBanner.tsx (NEW)
├── RiceCookedWarning.tsx (NEW)
└── RestaurantWarning.tsx (NEW)
```

## Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Barcode not found | Manual entry → save to personal library |
| Incomplete data | Show warning + allow editing |
| Suspect data | Highlight in red + warning banner |
| No internet | Check cache → manual entry |
| Camera permission denied | Deep link to settings + manual entry |
| Camera error | Graceful error + manual entry |
| Poor lighting | Auto-suggest torch after 3 fails |
| Curved barcode | Manual entry after 5 seconds |
| Rice raw vs cooked | Force selection modal |
| Restaurant food | Auto-add ±20% variance note |
| Edit personal food | "Update past logs?" prompt |
| Duplicate food | "Merge or save separately?" |
| Validation fail | Show warnings, allow override |
| No search results | "Add manually" or "Scan barcode" |
| API rate limit | Fallback → manual entry |
| Offline | Local data works, API shows message |

## Testing Checklist

### Barcode Scanning
- [ ] Scan valid barcode → shows nutrition card
- [ ] Scan invalid barcode → "Not found" + manual entry
- [ ] Scan with poor lighting → torch suggestion
- [ ] Scan curved/damaged barcode → manual entry fallback
- [ ] Manual barcode entry works
- [ ] Cancel button works
- [ ] Torch toggle works

### Data Validation
- [ ] Macro-calorie mismatch → warning shown
- [ ] Missing fields → warning shown
- [ ] Impossible values → warning shown
- [ ] Good data → verified badge

### Search
- [ ] Personal library searched first
- [ ] Indian DB searched second
- [ ] Packaged products searched third
- [ ] Results grouped correctly
- [ ] Duplicate detection works

### Offline
- [ ] Indian DB works offline
- [ ] Personal library works offline
- [ ] Cached barcodes work offline
- [ ] API calls show "Requires connection"

### API Failures
- [ ] OFF timeout → Nutritionix fallback
- [ ] Both fail → manual entry
- [ ] Rate limit → manual entry
- [ ] Network error → cache → manual entry

## Implementation Notes

### Data Quality Levels
- **verified**: All fields present, macros match calories
- **partial**: Some fields missing (1-2)
- **suspect**: Macro-calorie mismatch >15%
- **poor**: 3+ fields missing
- **estimated**: Restaurant/outside food
- **user_entered**: Personal library

### Validation Rules
1. Macro-calorie consistency: (P×4 + C×4 + F×9) vs stated calories
2. Missing critical fields: calories, protein, carbs, fat
3. Physiologically impossible: P>100g, F>100g, Cal>900
4. Total macros: P+C+F should not exceed 105g per 100g

### Search Priority
1. Personal Library (user's own data)
2. Indian Food DB (local, instant)
3. Open Food Facts (only for packaged products)

### Caching Strategy
- Cache all successful barcode lookups
- Update `last_used` on each access
- Works offline after first scan
- No expiration (user can manually refresh)

## Next Action

Continue with **Step 4: Scanner Screen Component**

Create `app/modals/barcode-scanner.tsx` with:
- Camera integration
- Barcode detection
- UI states (scanning, detecting, found, not found, error)
- Torch toggle
- Manual entry fallback
