// Indian Food Database - IFCT 2017 Sourced
// Version 1.0 - Starter with 20 essential foods
// Expand to 85 foods as needed

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
    aliases: ['chapati', 'phulka', 'wheat roti'],
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
  // Add more foods here...
];

export const DATABASE_VERSION = '1.0';
export const LAST_UPDATED = '2026-05-09';
