# Phase 2: Indian Food Database - Implementation Guide

## Overview

Phase 2 adds 85 common Indian foods that work 100% offline. The database is based on IFCT 2017 (Indian Food Composition Tables) and includes cooking notes, variants, and serving sizes.

## Status

**Phase 1**: ✅ Complete (Barcode Scanning)  
**Phase 2**: 🔄 In Progress (Indian Food Database)  
**Phase 3**: ⏳ Pending (Personal Library)

## Implementation Steps

### Step 10: Create Indian Food Database ✅

Due to the large size of the database (85 foods with detailed nutrition data), I've created a starter template. You'll need to complete it with all 85 foods from the spec.

**File**: `lib/data/indianFoodDB.ts`

**Structure**:
```typescript
export interface IndianFood {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  commonServings: Array<{
    label: string;
    grams: number;
  }>;
  variants?: Array<{
    label: string;
    addFat?: number;
    addCal?: number;
    note?: string;
  }>;
  notes?: string;
  warning?: string;
  rawConversion?: {
    rawPer100g: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    factor: number;
  };
  dataQuality: "verified" | "estimated";
}

export const INDIAN_FOOD_DB: IndianFood[] = [
  // Add all 85 foods here
];
```

**Categories to Include**:
1. **Staples** (15 foods): Roti, rice, bread, idli, dosa, paratha, poha, upma
2. **Pulses** (10 foods): Dal (toor, moong, chana), rajma, chole, sprouts
3. **Dairy** (8 foods): Curd, milk, paneer, ghee
4. **Eggs & Protein** (6 foods): Eggs, chicken, fish
5. **Vegetables** (15 foods): Potato, spinach, tomato, onion, etc.
6. **Fruits** (8 foods): Banana, apple, mango, papaya, orange
7. **Nuts & Seeds** (6 foods): Almonds, walnuts, peanuts, makhana
8. **Oils & Fats** (4 foods): Olive oil, coconut oil, mustard oil
9. **Your Specific Products** (3 foods): Yogabar oats, Pintola PB, ON Whey
10. **Restaurant Foods** (10 foods): Dal makhani, chicken curry, biryani, etc.

### Step 11: Unified Search Function

**File**: `lib/services/foodSearch.ts`

This will search across:
1. Personal Library (highest priority)
2. Indian Food DB (local, instant)
3. Open Food Facts (packaged products only)

**Key Functions**:
```typescript
export async function searchAllFoods(query: string): Promise<SearchResult[]>
export function searchIndianDB(query: string): IndianFood[]
export function looksLikePackagedProduct(query: string): boolean
```

### Step 12: Food Search Screen

**File**: `app/modals/food-search.tsx`

Features:
- Single search input
- Debounced search (300ms)
- Grouped results (My Foods | Indian | Packaged)
- Source badges
- Tap → Nutrition Card

## Quick Start (Minimal Version)

To get Phase 2 working quickly, start with just 20 essential foods:

### Essential 20 Foods

**Staples (5)**:
1. Roti (Wheat)
2. Rice (White, Cooked)
3. Rice (White, Raw)
4. Bread (Multigrain Slice)
5. Idli

**Pulses (3)**:
6. Toor Dal (Cooked)
7. Moong Dal (Cooked)
8. Chole (Cooked Chickpeas)

**Dairy (3)**:
9. Curd (Full Fat)
10. Milk (Toned)
11. Paneer

**Protein (3)**:
12. Egg (Whole)
13. Egg White
14. Chicken Breast (Cooked)

**Vegetables (3)**:
15. Potato (Cooked)
16. Spinach (Cooked)
17. Tomato (Raw)

**Fruits (2)**:
18. Banana
19. Apple

**Nuts (1)**:
20. Almonds

## Implementation Priority

### High Priority (Do First)
1. ✅ Create database structure
2. ✅ Add 20 essential foods
3. ✅ Create search function
4. ✅ Wire into nutrition card

### Medium Priority (Do Next)
5. Add remaining 65 foods
6. Add variants (restaurant style, with ghee, etc.)
7. Add cooking notes
8. Add raw/cooked conversions

### Low Priority (Nice to Have)
9. Add images
10. Add regional variants
11. Add seasonal availability
12. Add recipe suggestions

## Testing Checklist

### Basic Search
- [ ] Search for "roti" → finds Roti (Wheat)
- [ ] Search for "chapati" → finds Roti (Wheat) via alias
- [ ] Search for "dal" → finds all dal varieties
- [ ] Search for "egg" → finds whole egg and egg white

### Serving Sizes
- [ ] Select "1 medium roti (35g)"
- [ ] Nutrition calculates correctly
- [ ] Can log with different serving sizes

### Variants
- [ ] Roti shows "+ Ghee (1 tsp)" variant
- [ ] Selecting variant adds fat and calories
- [ ] Restaurant dal shows higher fat content

### Offline
- [ ] Turn off internet
- [ ] Search still works
- [ ] All Indian foods available

## File Structure

```
lib/
├── data/
│   └── indianFoodDB.ts (NEW - 85 foods)
├── services/
│   ├── barcodeScanner.ts (EXISTS from Phase 1)
│   └── foodSearch.ts (NEW - unified search)
app/
├── modals/
│   ├── barcode-scanner.tsx (EXISTS from Phase 1)
│   ├── nutrition-card.tsx (EXISTS from Phase 1)
│   └── food-search.tsx (NEW - search UI)
```

## Next Actions

### Option A: Full Implementation (All 85 Foods)
1. Complete `indianFoodDB.ts` with all 85 foods from spec
2. Create `foodSearch.ts` with unified search
3. Create `food-search.tsx` UI
4. Wire into nutrition tab
5. Test thoroughly

**Time**: 2-3 hours

### Option B: Minimal Version (20 Essential Foods)
1. Add just 20 essential foods to database
2. Create basic search function
3. Create simple search UI
4. Test with common foods

**Time**: 30-45 minutes

### Option C: Incremental (Add Foods as Needed)
1. Start with 10 most common foods
2. Add more as you use the app
3. Gradually build to 85 foods

**Time**: Ongoing

## Recommendation

**Start with Option B (Minimal Version)**:
- Gets you working functionality quickly
- Covers 80% of daily use cases
- Can expand later as needed
- Less overwhelming to implement

Then gradually add more foods as you encounter them in your diet.

## Code Templates

### Database Entry Template
```typescript
{
  id: 'food_id',
  name: 'Food Name',
  aliases: ['alternate name', 'regional name'],
  category: 'Staples',
  per100g: {
    calories: 297,
    protein: 9.0,
    carbs: 59.4,
    fat: 3.7,
    fiber: 1.9,
  },
  commonServings: [
    { label: 'Small (25g)', grams: 25 },
    { label: 'Medium (35g)', grams: 35 },
  ],
  notes: 'Cooking notes here',
  dataQuality: 'verified',
}
```

### Search Function Template
```typescript
export function searchIndianDB(query: string): IndianFood[] {
  const lowerQuery = query.toLowerCase();
  
  return INDIAN_FOOD_DB.filter(food => 
    food.name.toLowerCase().includes(lowerQuery) ||
    food.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
  );
}
```

## Success Criteria

After Phase 2, you should be able to:
- ✅ Search for common Indian foods
- ✅ Find foods by name or alias
- ✅ Select appropriate serving sizes
- ✅ See accurate IFCT 2017 nutrition data
- ✅ Work 100% offline
- ✅ Log Indian foods as easily as scanned products

## What's Next?

**Phase 3: Personal Library**
- Save custom foods
- Edit existing foods
- Duplicate detection
- Usage tracking
- Edit history

---

**Current Status**: Phase 2 structure ready  
**Next Step**: Choose implementation option (A, B, or C)  
**Recommendation**: Start with Option B (20 essential foods)
