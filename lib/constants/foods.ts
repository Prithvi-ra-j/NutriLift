export interface FoodItem {
  name: string;
  serving_size: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export const COMMON_FOODS: FoodItem[] = [
  // Eggs
  { name: "Whole Egg", serving_size: "1 large", quantity_g: 50, calories: 70, protein_g: 6, carbs_g: 0.5, fat_g: 5, fiber_g: 0 },
  { name: "Egg White", serving_size: "1 white", quantity_g: 33, calories: 17, protein_g: 3.6, carbs_g: 0.2, fat_g: 0.1, fiber_g: 0 },

  // Indian staples
  { name: "Roti (Wheat)", serving_size: "1 medium", quantity_g: 30, calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1, fiber_g: 1.5 },
  { name: "Cooked Rice", serving_size: "1 cup", quantity_g: 200, calories: 260, protein_g: 5, carbs_g: 57, fat_g: 0.5, fiber_g: 0.6 },
  { name: "Dal (Cooked)", serving_size: "1 cup", quantity_g: 230, calories: 180, protein_g: 12, carbs_g: 30, fat_g: 1, fiber_g: 8 },
  { name: "Curd / Yogurt", serving_size: "1 cup", quantity_g: 245, calories: 150, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0 },
  { name: "Paneer", serving_size: "100g", quantity_g: 100, calories: 265, protein_g: 18, carbs_g: 3, fat_g: 20, fiber_g: 0 },
  { name: "Sabji (Mixed Veg)", serving_size: "1 cup", quantity_g: 150, calories: 80, protein_g: 3, carbs_g: 12, fat_g: 2, fiber_g: 3 },
  { name: "Chicken Breast (Cooked)", serving_size: "100g", quantity_g: 100, calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0 },

  // Supplements / Protein
  { name: "ON Gold Standard Whey", serving_size: "1 scoop (30g)", quantity_g: 30, calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1, fiber_g: 0 },
  { name: "Pintola HP Peanut Butter", serving_size: "2 tbsp", quantity_g: 32, calories: 190, protein_g: 8, carbs_g: 7, fat_g: 15, fiber_g: 2 },

  // Oats
  { name: "Yogabar HP Oats", serving_size: "50g dry", quantity_g: 50, calories: 185, protein_g: 10, carbs_g: 30, fat_g: 5, fiber_g: 4 },
  { name: "Regular Oats", serving_size: "50g dry", quantity_g: 50, calories: 190, protein_g: 7, carbs_g: 34, fat_g: 3, fiber_g: 4 },

  // Snacks
  { name: "Roasted Chana", serving_size: "30g", quantity_g: 30, calories: 100, protein_g: 7, carbs_g: 15, fat_g: 2, fiber_g: 3 },
  { name: "Multigrain Bread", serving_size: "1 slice", quantity_g: 35, calories: 85, protein_g: 3.5, carbs_g: 15, fat_g: 1.5, fiber_g: 2 },
  { name: "Banana", serving_size: "1 medium", quantity_g: 120, calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3 },
  { name: "Apple", serving_size: "1 medium", quantity_g: 182, calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4 },
  { name: "Milk (Full Fat)", serving_size: "1 cup (240ml)", quantity_g: 244, calories: 149, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0 },
  { name: "Milk (Toned)", serving_size: "1 cup (240ml)", quantity_g: 244, calories: 102, protein_g: 8, carbs_g: 12, fat_g: 2.5, fiber_g: 0 },
];

export interface MealTemplate {
  name: string;
  meal: "breakfast" | "lunch" | "snack" | "dinner";
  items: Array<{ food: FoodItem; quantity_multiplier: number }>;
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: "Prithvi's Breakfast",
    meal: "breakfast",
    items: [
      { food: COMMON_FOODS.find(f => f.name === "Whole Egg")!, quantity_multiplier: 4 },
      { food: COMMON_FOODS.find(f => f.name === "Egg White")!, quantity_multiplier: 3 },
      { food: COMMON_FOODS.find(f => f.name === "ON Gold Standard Whey")!, quantity_multiplier: 1 },
      { food: COMMON_FOODS.find(f => f.name === "Yogabar HP Oats")!, quantity_multiplier: 1 },
    ],
  },
  {
    name: "Office Lunch",
    meal: "lunch",
    items: [
      { food: COMMON_FOODS.find(f => f.name === "Dal (Cooked)")!, quantity_multiplier: 1 },
      { food: COMMON_FOODS.find(f => f.name === "Roti (Wheat)")!, quantity_multiplier: 3 },
      { food: COMMON_FOODS.find(f => f.name === "Cooked Rice")!, quantity_multiplier: 0.5 },
      { food: COMMON_FOODS.find(f => f.name === "Curd / Yogurt")!, quantity_multiplier: 0.5 },
    ],
  },
  {
    name: "5PM Snack",
    meal: "snack",
    items: [
      { food: COMMON_FOODS.find(f => f.name === "Multigrain Bread")!, quantity_multiplier: 2 },
      { food: COMMON_FOODS.find(f => f.name === "Pintola HP Peanut Butter")!, quantity_multiplier: 1 },
      { food: COMMON_FOODS.find(f => f.name === "Roasted Chana")!, quantity_multiplier: 1 },
    ],
  },
  {
    name: "Standard Dinner",
    meal: "dinner",
    items: [
      { food: COMMON_FOODS.find(f => f.name === "Whole Egg")!, quantity_multiplier: 3 },
      { food: COMMON_FOODS.find(f => f.name === "Roti (Wheat)")!, quantity_multiplier: 2 },
      { food: COMMON_FOODS.find(f => f.name === "Sabji (Mixed Veg)")!, quantity_multiplier: 1 },
      { food: COMMON_FOODS.find(f => f.name === "Curd / Yogurt")!, quantity_multiplier: 0.5 },
    ],
  },
];
