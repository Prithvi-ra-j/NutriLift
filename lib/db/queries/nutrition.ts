import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../client";
import { foodLogs, dailyNutrition, favoriteFoods, repeatableMeals, type FoodLog, type NewFoodLog, type DailyNutrition, type FavoriteFood } from "../schema";
import { getNutritionTargetsForDate } from "./nutrition-targets";
import { addCalendarDays, fromLocalDateKey, toLocalDateKey } from "../../utils/local-date";
import { validateFoodLogInput, validateFoodLogsInput } from "../../data/food-log-validation";
import { calculateTargetComparison } from "../../nutrition/target-validation";
import { enqueueDailyNutrition, enqueueTombstone } from "./sync-outbox";
import { appendDomainEvent } from "./domain-events";

// ─── Food Log Queries ─────────────────────────────────────────────────────────

export async function getFoodLogsForDate(date: string): Promise<FoodLog[]> {
  return db.select().from(foodLogs).where(eq(foodLogs.date, date));
}

export interface MealSummary {
  meal: string;
  items: FoodLog[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export function groupFoodLogsByMeal(logs: FoodLog[]): MealSummary[] {
  const groups = new Map<string, FoodLog[]>();
  for (const log of logs) {
    const items = groups.get(log.meal) ?? [];
    items.push(log);
    groups.set(log.meal, items);
  }
  const standardOrder = ["breakfast", "lunch", "snack", "dinner"];
  const orderedMeals = [...standardOrder.filter((meal) => groups.has(meal)), ...Array.from(groups.keys()).filter((meal) => !standardOrder.includes(meal))];
  return orderedMeals.map((meal) => {
    const items = groups.get(meal) ?? [];
    return {
      meal, items,
      totalCalories: items.reduce((sum, item) => sum + item.calories, 0),
      totalProtein: items.reduce((sum, item) => sum + item.protein_g, 0),
      totalCarbs: items.reduce((sum, item) => sum + item.carbs_g, 0),
      totalFat: items.reduce((sum, item) => sum + item.fat_g, 0),
    };
  });
}

export async function getMealSummary(date: string): Promise<MealSummary[]> {
  try { fromLocalDateKey(date); } catch { throw new Error("Meal summary date must be a real YYYY-MM-DD calendar date."); }
  return groupFoodLogsByMeal(await getFoodLogsForDate(date));
}
export async function getFoodLogsByMeal(date: string, meal: string): Promise<FoodLog[]> {
  return db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.date, date), eq(foodLogs.meal, meal)));
}

export async function insertFoodLogs(logs: NewFoodLog[]): Promise<void> {
  validateFoodLogsInput(logs);
  // The food rows and their daily aggregate commit or roll back together.
  await db.transaction(async (tx: any) => {
    const date = logs[0].date;
    const targets = await getNutritionTargetsForDate(date, tx);
    await tx.insert(foodLogs).values(logs);
    const rows = await tx.select().from(foodLogs).where(eq(foodLogs.date, date));
    const totals = rows.reduce(
      (acc: { calories: number; protein_g: number; carbs_g: number; fat_g: number }, log: FoodLog) => ({
        calories: acc.calories + log.calories,
        protein_g: acc.protein_g + log.protein_g,
        carbs_g: acc.carbs_g + log.carbs_g,
        fat_g: acc.fat_g + log.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const comparison = calculateTargetComparison({
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
    }, targets);
    const summary = {
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      ...comparison,
      is_complete: 0,
      completed_at: null,
      updated_at: new Date().toISOString(),
    };
    const existing = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date));
    if (existing.length > 0) {
      await tx.update(dailyNutrition).set(summary).where(eq(dailyNutrition.date, date));
    } else {
      await tx.insert(dailyNutrition).values({ date, ...summary });
    }
    const persistedSummary = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
    if (persistedSummary[0]) await enqueueDailyNutrition(tx, persistedSummary[0]);
    for (const log of logs) {
      await appendDomainEvent(tx, {
        id: `food-log:${log.id}:created`, eventType: "nutrition.food.created",
        entityType: "food_log", entityId: log.id, entityVersion: Math.max(1, Math.floor(log.created_at)),
        occurredAt: new Date(log.created_at * 1000).toISOString(),
        metadata: { date: log.date, source: log.source },
      });
    }
  });
}

export async function insertFoodLog(log: NewFoodLog): Promise<void> {
  await insertFoodLogs([log]);
}

export async function deleteFoodLog(id: string, date: string): Promise<void> {
  // Keep the source row and every potentially affected aggregate consistent.
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    const existing = rows[0] as FoodLog | undefined;
    if (!existing) return;
    await tx.delete(foodLogs).where(eq(foodLogs.id, id));
    const deletedAt = new Date().toISOString();
    const deletedVersion = Date.now();
    await appendDomainEvent(tx, {
      id: `food-log:${id}:deleted:${deletedVersion}`, eventType: "nutrition.food.deleted",
      entityType: "food_log", entityId: id, entityVersion: deletedVersion,
      occurredAt: deletedAt, metadata: { date: existing.date, source: existing.source },
    });
    for (const affectedDate of new Set([existing.date, date])) {
      await recomputeDailyNutritionInTransaction(tx, affectedDate);
    }
  });
}

export async function updateFoodLog(id: string, updates: Partial<NewFoodLog>, date: string): Promise<void> {
  // Read, validate and mutate under one transaction so a concurrent edit cannot
  // be overwritten by a stale pre-transaction snapshot.
  const { id: _ignoredId, ...mutableUpdates } = updates;
  await db.transaction(async (tx: any) => {
    const existingRows = await tx.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    const existing = existingRows[0] as FoodLog | undefined;
    if (!existing) throw new Error("Food log not found.");
    const next = { ...existing, ...mutableUpdates } as FoodLog;
    validateFoodLogInput(next as NewFoodLog);
    const affectedDates = Array.from(new Set([existing.date, next.date, date]));
    await tx.update(foodLogs).set(mutableUpdates).where(eq(foodLogs.id, id));
    const updatedAt = new Date().toISOString();
    const updatedVersion = Date.now();
    await appendDomainEvent(tx, {
      id: `food-log:${id}:updated:${updatedVersion}`, eventType: "nutrition.food.updated",
      entityType: "food_log", entityId: id, entityVersion: updatedVersion,
      occurredAt: updatedAt, metadata: { date: next.date, source: next.source },
    });
    for (const affectedDate of affectedDates) {
      await recomputeDailyNutritionInTransaction(tx, affectedDate);
    }
  });
}

// ─── Daily Nutrition Queries ──────────────────────────────────────────────────

export async function getDailyNutrition(date: string): Promise<DailyNutrition | null> {
  const result = await db
    .select()
    .from(dailyNutrition)
    .where(eq(dailyNutrition.date, date));
  return result[0] ?? null;
}

export interface NutritionCompleteness {
  date: string;
  itemCount: number;
  isComplete: boolean;
  completedAt: string | null;
  sourceCounts: Record<string, number>;
}

/** Return explicit coverage and review state; never infer that missing entries were eaten. */
export async function getNutritionCompleteness(date: string): Promise<NutritionCompleteness> {
  const [meals, summary] = await Promise.all([
    getMealSummary(date),
    getDailyNutrition(date),
  ]);
  const logs = meals.flatMap((meal) => meal.items);
  const sourceCounts: Record<string, number> = {};
  for (const log of logs) sourceCounts[log.source] = (sourceCounts[log.source] ?? 0) + 1;
  return {
    date,
    itemCount: logs.length,
    isComplete: summary?.is_complete === 1,
    completedAt: summary?.completed_at ?? null,
    sourceCounts,
  };
}

export interface RecentFoodSuggestion {
  name: string;
  meal: string;
  quantity_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  lastUsedDate: string;
}

/** Return actual recent logged foods, deduplicated by name; never invent favourites. */
export async function getRecentFoods(query = "", limit = 12): Promise<RecentFoodSuggestion[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Recent food limit must be an integer from 1 to 50.");
  const rows = await db.select().from(foodLogs).orderBy(desc(foodLogs.created_at)).limit(500) as FoodLog[];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  const result: RecentFoodSuggestion[] = [];
  for (const row of rows) {
    const key = row.name.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || (normalizedQuery && !key.includes(normalizedQuery))) continue;
    seen.add(key);
    result.push({
      name: row.name, meal: row.meal, quantity_g: row.quantity_g ?? null,
      calories: row.calories, protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g,
      lastUsedDate: row.date,
    });
    if (result.length >= limit) break;
  }
  return result;
}
export async function getFavoriteFoods(query = "", limit = 50): Promise<FavoriteFood[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Favorite food limit must be an integer from 1 to 100.");
  const rows = await db.select().from(favoriteFoods).orderBy(desc(favoriteFoods.updated_at)).limit(500) as FavoriteFood[];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return rows.filter((row) => !normalizedQuery || row.name.toLocaleLowerCase().includes(normalizedQuery)).slice(0, limit);
}

export async function addFavoriteFoodFromLog(foodLogId: string): Promise<void> {
  if (!foodLogId.trim()) throw new Error("Food log id is required.");
  const { default: uuid } = await import("react-native-uuid");
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(foodLogs).where(eq(foodLogs.id, foodLogId)).limit(1);
    const food = rows[0] as FoodLog | undefined;
    if (!food) throw new Error("Food log not found.");
    const normalizedName = food.name.trim().toLocaleLowerCase();
    if (!normalizedName) throw new Error("A food needs a name before it can be saved as a favourite.");
    const existingRows = await tx.select().from(favoriteFoods).where(eq(favoriteFoods.normalized_name, normalizedName)).limit(1);
    const existing = existingRows[0] as FavoriteFood | undefined;
    const now = new Date().toISOString();
    const id = existing?.id ?? (uuid.v4() as string);
    const favorite = {
      id, normalized_name: normalizedName, name: food.name.trim(), meal: food.meal,
      quantity_g: food.quantity_g ?? null, calories: food.calories, protein_g: food.protein_g,
      carbs_g: food.carbs_g, fat_g: food.fat_g, fiber_g: food.fiber_g ?? null,
      sugar_g: food.sugar_g ?? null, sodium_mg: food.sodium_mg ?? null,
      source: food.source, created_at: existing?.created_at ?? now, updated_at: now,
    };
    await tx.insert(favoriteFoods).values(favorite).onConflictDoUpdate({
      target: favoriteFoods.normalized_name,
      set: { ...favorite, id: existing?.id ?? id, created_at: existing?.created_at ?? now },
    });
    const eventVersion = Date.now();
    await appendDomainEvent(tx, {
      id: `favorite-food:${id}:changed:${now}`, eventType: "nutrition.favorite.changed",
      entityType: "favorite_food", entityId: id, entityVersion: eventVersion, occurredAt: now,
      metadata: { action: "saved" },
    });
  });
}

export async function removeFavoriteFood(favoriteId: string): Promise<void> {
  if (!favoriteId.trim()) throw new Error("Favorite food id is required.");
  await db.transaction(async (tx: any) => {
    const rows = await tx.select().from(favoriteFoods).where(eq(favoriteFoods.id, favoriteId)).limit(1);
    if (!rows[0]) return;
    await tx.delete(favoriteFoods).where(eq(favoriteFoods.id, favoriteId));
    const now = new Date().toISOString();
    const eventVersion = Date.now();
    await appendDomainEvent(tx, {
      id: `favorite-food:${favoriteId}:removed:${now}`, eventType: "nutrition.favorite.changed",
      entityType: "favorite_food", entityId: favoriteId, entityVersion: eventVersion, occurredAt: now,
      metadata: { action: "removed" },
    });
  });
}

export interface RepeatableMealItem {
  name: string;
  quantity_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  source?: string;
}

export interface RepeatableMealWithItems {
  id: string;
  name: string;
  meal: string;
  items: RepeatableMealItem[];
  created_at: string;
  updated_at: string;
}

function validateRepeatableMealItems(items: RepeatableMealItem[]): void {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error("A repeatable meal must contain between 1 and 50 items.");
  for (const item of items) {
    if (!item.name?.trim()) throw new Error("Every repeatable meal item needs a name.");
    for (const [label, value] of Object.entries({
      quantity_g: item.quantity_g, calories: item.calories, protein_g: item.protein_g,
      carbs_g: item.carbs_g, fat_g: item.fat_g, fiber_g: item.fiber_g ?? null,
      sugar_g: item.sugar_g ?? null, sodium_mg: item.sodium_mg ?? null,
    })) {
      if (value != null && (!Number.isFinite(value) || value < 0)) throw new Error(`Repeatable meal ${label} must be finite and non-negative.`);
    }
  }
}

export async function saveRepeatableMeal(input: {
  id?: string;
  name: string;
  meal: string;
  items: RepeatableMealItem[];
}): Promise<string> {
  const name = input.name.trim();
  const meal = input.meal.trim().toLocaleLowerCase();
  if (!name || name.length > 100) throw new Error("Repeatable meal name must contain 1 to 100 characters.");
  if (!["breakfast", "lunch", "snack", "dinner"].includes(meal)) throw new Error("Repeatable meal type is invalid.");
  validateRepeatableMealItems(input.items);
  const { default: uuid } = await import("react-native-uuid");
  const id = input.id?.trim() || (uuid.v4() as string);
  const now = new Date().toISOString();
  const { id: _id, ...values } = { id, name, meal, items_json: JSON.stringify(input.items), created_at: now, updated_at: now };
  await db.insert(repeatableMeals).values({ id, ...values }).onConflictDoUpdate({
    target: repeatableMeals.id,
    set: { name, meal, items_json: JSON.stringify(input.items), updated_at: now },
  });
  return id;
}

export async function getRepeatableMeal(id: string): Promise<RepeatableMealWithItems | null> {
  if (!id.trim()) throw new Error("Repeatable meal id is required.");
  const rows = await db.select().from(repeatableMeals).where(eq(repeatableMeals.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  let items: RepeatableMealItem[];
  try {
    const parsed: unknown = JSON.parse(row.items_json);
    if (!Array.isArray(parsed)) throw new Error("Items must be an array.");
    items = parsed as RepeatableMealItem[];
    validateRepeatableMealItems(items);
  } catch {
    throw new Error("Saved repeatable meal is invalid. Edit or remove this template before using it.");
  }
  return { id: row.id, name: row.name, meal: row.meal, items, created_at: row.created_at, updated_at: row.updated_at };
}

export async function getRepeatableMeals(query = "", limit = 20): Promise<Array<Omit<RepeatableMealWithItems, "items"> & { itemCount: number }>> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Repeatable meal limit must be an integer from 1 to 100.");
  const rows = await db.select().from(repeatableMeals).orderBy(desc(repeatableMeals.updated_at)).limit(500);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return rows.filter((row: any) => !normalizedQuery || row.name.toLocaleLowerCase().includes(normalizedQuery))
    .slice(0, limit).map((row: any) => {
      const meal = JSON.parse(row.items_json);
      return { id: row.id, name: row.name, meal: row.meal, created_at: row.created_at, updated_at: row.updated_at, itemCount: Array.isArray(meal) ? meal.length : 0 };
    });
}

export async function saveRepeatableMealFromLogs(name: string, meal: string, foodLogIds: string[]): Promise<string> {
  if (!Array.isArray(foodLogIds) || foodLogIds.length < 1 || foodLogIds.length > 50) throw new Error("Select between 1 and 50 food log items.");
  const logs = await Promise.all(foodLogIds.map(async (id) => {
    const rows = await db.select().from(foodLogs).where(eq(foodLogs.id, id)).limit(1);
    if (!rows[0]) throw new Error("One of the selected food logs no longer exists.");
    return rows[0] as FoodLog;
  }));
  const items = logs.map((row) => ({
    name: row.name, quantity_g: row.quantity_g ?? null, calories: row.calories,
    protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g,
    fiber_g: row.fiber_g ?? null, sugar_g: row.sugar_g ?? null, sodium_mg: row.sodium_mg ?? null,
    source: row.source,
  }));
  return saveRepeatableMeal({ name, meal, items });
}

export async function repeatMeal(id: string, date: string): Promise<void> {
  try { fromLocalDateKey(date); } catch { throw new Error("Repeat meal date must be a real YYYY-MM-DD calendar date."); }
  const template = await getRepeatableMeal(id);
  if (!template) throw new Error("Repeatable meal not found.");
  const { default: uuid } = await import("react-native-uuid");
  const createdAt = Math.floor(Date.now() / 1000);
  const logs: NewFoodLog[] = template.items.map((item) => ({
    id: uuid.v4() as string, date, meal: template.meal, name: item.name,
    quantity_g: item.quantity_g, calories: item.calories, protein_g: item.protein_g,
    carbs_g: item.carbs_g, fat_g: item.fat_g, fiber_g: item.fiber_g ?? null,
    sugar_g: item.sugar_g ?? null, sodium_mg: item.sodium_mg ?? null,
    source: "repeat", raw_input: `Repeated meal template: ${template.name}`, created_at: createdAt,
  }));
  await insertFoodLogs(logs);
}

export async function deleteRepeatableMeal(id: string): Promise<void> {
  if (!id.trim()) throw new Error("Repeatable meal id is required.");
  await db.delete(repeatableMeals).where(eq(repeatableMeals.id, id));
}

export async function getDailyNutritionRange(
  startDate: string,
  endDate: string
): Promise<DailyNutrition[]> {
  return db
    .select()
    .from(dailyNutrition)
    .where(and(gte(dailyNutrition.date, startDate), lte(dailyNutrition.date, endDate)))
    .orderBy(dailyNutrition.date);
}

export async function getLast7DaysNutrition(): Promise<DailyNutrition[]> {
  const today = toLocalDateKey();
  return getDailyNutritionRange(addCalendarDays(today, -6), today);
}

export async function getLast30DaysNutrition(): Promise<DailyNutrition[]> {
  const today = toLocalDateKey();
  return getDailyNutritionRange(addCalendarDays(today, -29), today);
}

// ─── Recompute Daily Nutrition ────────────────────────────────────────────────

async function recomputeDailyNutritionInTransaction(tx: any, date: string): Promise<void> {
  const logs = await tx.select().from(foodLogs).where(eq(foodLogs.date, date));
  if (logs.length === 0) {
    const summaries = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
    if (summaries[0]) {
      const deletedAt = new Date().toISOString();
      await enqueueTombstone(tx, "daily_nutrition", date, deletedAt, `nutrilift:daily_nutrition:${date}`);
      await tx.delete(dailyNutrition).where(eq(dailyNutrition.date, date));
    }
    return;
  }

  const targets = await getNutritionTargetsForDate(date, tx);
  const totals = logs.reduce(
    (acc: { calories: number; protein_g: number; carbs_g: number; fat_g: number }, log: FoodLog) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  const comparison = calculateTargetComparison({
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
  }, targets);
  const summary = {
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
    total_carbs_g: totals.carbs_g,
    total_fat_g: totals.fat_g,
    ...comparison,
    is_complete: 0,
    completed_at: null,
    updated_at: new Date().toISOString(),
  };
  const existing = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
  if (existing.length) {
    await tx.update(dailyNutrition).set(summary).where(eq(dailyNutrition.date, date));
  } else {
    await tx.insert(dailyNutrition).values({ date, ...summary });
  }
  const persistedSummary = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
  if (persistedSummary[0]) await enqueueDailyNutrition(tx, persistedSummary[0]);
}

export async function recomputeDailyNutrition(date: string): Promise<void> {
  await db.transaction(async (tx: any) => {
    await recomputeDailyNutritionInTransaction(tx, date);
  });
}

/** Mark a logged day reviewed only after the user explicitly confirms it is complete. */
export async function setNutritionDayComplete(date: string, complete: boolean): Promise<void> {
  try {
    fromLocalDateKey(date);
  } catch {
    throw new Error("Nutrition completion date must be a real YYYY-MM-DD calendar date.");
  }
  await db.transaction(async (tx: any) => {
    const summaries = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
    if (!summaries[0]) {
      if (complete) throw new Error("Log at least one food item before marking this day complete.");
      return;
    }
    if (complete) {
      const logs = await tx.select({ id: foodLogs.id }).from(foodLogs).where(eq(foodLogs.date, date)).limit(1);
      if (logs.length === 0) throw new Error("Log at least one food item before marking this day complete.");
    }
    const now = new Date().toISOString();
    await tx.update(dailyNutrition).set({ is_complete: complete ? 1 : 0, completed_at: complete ? now : null, updated_at: now })
      .where(eq(dailyNutrition.date, date));
    const persistedSummary = await tx.select().from(dailyNutrition).where(eq(dailyNutrition.date, date)).limit(1);
    if (persistedSummary[0]) await enqueueDailyNutrition(tx, persistedSummary[0]);
  });
}
// ─── Analytics Helpers ────────────────────────────────────────────────────────

export async function getProteinHitRate(days: number = 30): Promise<number> {
  const nutrition = await getLast30DaysNutrition();
  if (nutrition.length === 0) return 0;
  const hits = nutrition.filter((d) => d.protein_target_met === 1).length;
  return (hits / nutrition.length) * 100;
}

export async function getBestProteinStreak(): Promise<number> {
  const nutrition = await getLast30DaysNutrition();
  let best = 0;
  let current = 0;
  for (const day of nutrition) {
    if (day.protein_target_met === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
