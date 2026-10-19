// Indian Food Database - mixed reference and estimated household values
// Version 1.1 - local deterministic starter catalogue

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
  dataQuality: 'verified' | 'estimated';
}

export const INDIAN_FOOD_DB: IndianFood[] = [
  // STAPLES
  {
    id: 'roti_wheat_plain',
    name: 'Roti (Wheat)',
    aliases: ['roti', 'rotis', 'chapati', 'phulka', 'wheat roti'],
    category: 'Staples',
    per100g: { calories: 297, protein: 9.0, carbs: 59.4, fat: 3.7, fiber: 1.9 },
    commonServings: [
      { label: 'Small (25g)', grams: 25 },
      { label: 'Medium (35g)', grams: 35 },
      { label: 'Large (45g)', grams: 45 },
    ],
    variants: [
      { label: '+ Ghee (1 tsp)', addFat: 4.5, addCal: 40 },
    ],
    notes: 'Weight before cooking. Values for dry-roasted tawa roti.',
    dataQuality: 'verified'
  },
  // Everyday staples and protein sources. Values are normalized per 100 g;
  // serving weights are estimates and vary with recipe and preparation.
  {
    id: 'whole_egg',
    name: 'Whole egg',
    aliases: ['egg', 'eggs', 'boiled egg', 'boiled eggs', 'anda', 'ande'],
    category: 'Protein',
    per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
    commonServings: [{ label: '1 medium egg (50g)', grams: 50 }],
    notes: 'Values vary slightly by egg size and preparation.',
    dataQuality: 'estimated'
  },
  {
    id: 'egg_white',
    name: 'Egg white',
    aliases: ['egg whites', 'white of egg'],
    category: 'Protein',
    per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0 },
    commonServings: [{ label: '1 egg white (33g)', grams: 33 }],
    dataQuality: 'estimated'
  },
  {
    id: 'cooked_dal',
    name: 'Dal (cooked)',
    aliases: ['dal', 'daal', 'lentils', 'cooked lentils', 'toor dal', 'moong dal'],
    category: 'Staples',
    per100g: { calories: 116, protein: 7.5, carbs: 20.1, fat: 0.4, fiber: 7.9 },
    commonServings: [{ label: '1 bowl (200g)', grams: 200 }, { label: '1 cup (180g)', grams: 180 }],
    notes: 'Recipe and tadka oil change nutrition substantially.',
    dataQuality: 'estimated'
  },
  {
    id: 'cooked_rice',
    name: 'Rice (cooked)',
    aliases: ['rice', 'cooked rice', 'white rice', 'steamed rice', 'chawal'],
    category: 'Staples',
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
    commonServings: [{ label: '1 cup (160g)', grams: 160 }, { label: '1 bowl (200g)', grams: 200 }],
    dataQuality: 'estimated'
  },
  {
    id: 'plain_curd',
    name: 'Curd',
    aliases: ['dahi', 'yogurt', 'yoghurt', 'plain yogurt'],
    category: 'Dairy',
    per100g: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
    commonServings: [{ label: '1 small bowl (150g)', grams: 150 }, { label: '1 cup (200g)', grams: 200 }],
    dataQuality: 'estimated'
  },
  {
    id: 'milk',
    name: 'Milk',
    aliases: ['cow milk', 'glass of milk', 'doodh'],
    category: 'Dairy',
    per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
    commonServings: [{ label: '1 glass (200g)', grams: 200 }],
    notes: 'Assumes whole milk; toned and skimmed milk differ.',
    dataQuality: 'estimated'
  },
  {
    id: 'paneer',
    name: 'Paneer',
    aliases: ['cottage cheese', 'paneer cubes'],
    category: 'Protein',
    per100g: { calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0 },
    commonServings: [{ label: '100g portion', grams: 100 }],
    dataQuality: 'estimated'
  },
  {
    id: 'chicken_breast',
    name: 'Chicken breast (cooked)',
    aliases: ['chicken', 'chicken breast', 'grilled chicken', 'cooked chicken'],
    category: 'Protein',
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    commonServings: [{ label: '1 portion (100g)', grams: 100 }],
    notes: 'Assumes cooked, skinless breast without added oil or sauce.',
    dataQuality: 'estimated'
  },
  {
    id: 'banana',
    name: 'Banana',
    aliases: ['banana', 'bananas', 'kela'],
    category: 'Fruit',
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
    commonServings: [{ label: '1 medium banana (118g edible)', grams: 118 }],
    dataQuality: 'estimated'
  },
  {
    id: 'apple',
    name: 'Apple',
    aliases: ['apple', 'apples', 'seb'],
    category: 'Fruit',
    per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
    commonServings: [{ label: '1 medium apple (180g edible)', grams: 180 }],
    dataQuality: 'estimated'
  },
  {
    id: 'oats',
    name: 'Oats (dry)',
    aliases: ['oats', 'oatmeal', 'rolled oats'],
    category: 'Staples',
    per100g: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
    commonServings: [{ label: '1 serving (40g)', grams: 40 }, { label: '50g serving', grams: 50 }],
    dataQuality: 'estimated'
  },
  {
    id: 'whey_protein',
    name: 'Whey protein powder',
    aliases: ['whey', 'whey protein', 'protein powder', 'one scoop whey'],
    category: 'Protein',
    per100g: { calories: 400, protein: 80, carbs: 10, fat: 3.3, fiber: 0 },
    commonServings: [{ label: '1 scoop (30g)', grams: 30 }],
    notes: 'Brand-specific nutrition label should override this estimate.',
    dataQuality: 'estimated'
  },
  {
    id: 'roasted_chana',
    name: 'Roasted chana',
    aliases: ['roasted gram', 'bhuna chana', 'roasted chickpeas'],
    category: 'Protein',
    per100g: { calories: 369, protein: 22, carbs: 58, fat: 6, fiber: 17 },
    commonServings: [{ label: '1 handful (30g)', grams: 30 }],
    dataQuality: 'estimated'
  },
  {
    id: 'peanut_butter',
    name: 'Peanut butter',
    aliases: ['peanut butter', 'pb'],
    category: 'Protein',
    per100g: { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
    commonServings: [{ label: '1 tbsp (16g)', grams: 16 }, { label: '2 tbsp (32g)', grams: 32 }],
    dataQuality: 'estimated'
  },
  {
    id: 'idli',
    name: 'Idli',
    aliases: ['idli', 'idlis'],
    category: 'South Indian',
    per100g: { calories: 146, protein: 4.5, carbs: 30, fat: 0.7, fiber: 1.5 },
    commonServings: [{ label: '1 medium idli (40g)', grams: 40 }],
    dataQuality: 'estimated'
  },
  {
    id: 'plain_dosa',
    name: 'Plain dosa',
    aliases: ['dosa', 'plain dosa', 'dosai'],
    category: 'South Indian',
    per100g: { calories: 168, protein: 4, carbs: 29, fat: 3.5, fiber: 1.2 },
    commonServings: [{ label: '1 medium dosa (100g)', grams: 100 }],
    notes: 'Oil used during cooking can increase calories.',
    dataQuality: 'estimated'
  },
  {
    id: 'sambar',
    name: 'Sambar',
    aliases: ['sambhar'],
    category: 'South Indian',
    per100g: { calories: 65, protein: 3.2, carbs: 10.5, fat: 1.2, fiber: 2.5 },
    commonServings: [{ label: '1 bowl (180g)', grams: 180 }],
    dataQuality: 'estimated'
  },
  {
    id: 'poha',
    name: 'Poha',
    aliases: ['poha', 'flattened rice'],
    category: 'Breakfast',
    per100g: { calories: 180, protein: 3.5, carbs: 32, fat: 4.5, fiber: 2.5 },
    commonServings: [{ label: '1 bowl (180g)', grams: 180 }],
    notes: 'Recipe, peanuts and oil can change nutrition.',
    dataQuality: 'estimated'
  },
  {
    id: 'upma',
    name: 'Upma',
    aliases: ['upma', 'uppittu'],
    category: 'Breakfast',
    per100g: { calories: 160, protein: 4, carbs: 25, fat: 5, fiber: 2 },
    commonServings: [{ label: '1 bowl (180g)', grams: 180 }],
    notes: 'Recipe and oil can change nutrition.',
    dataQuality: 'estimated'
  },
  {
    id: 'boiled_potato',
    name: 'Potato (boiled)',
    aliases: ['potato', 'boiled potato', 'aloo'],
    category: 'Vegetables',
    per100g: { calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8 },
    commonServings: [{ label: '1 medium potato (150g)', grams: 150 }],
    dataQuality: 'estimated'
  },

];

export const DATABASE_VERSION = '1.1';
export const LAST_UPDATED = '2026-05-09';
