import { asc, desc, like, or } from "drizzle-orm";
import { db } from "../client";
import { personalFoods, type NewPersonalFood, type PersonalFood } from "../schema";

export async function getPersonalFoods(limit = 50): Promise<PersonalFood[]> {
  return db.select().from(personalFoods).orderBy(desc(personalFoods.times_logged), desc(personalFoods.updated_at)).limit(limit);
}

export async function searchPersonalFoods(query: string, limit = 20): Promise<PersonalFood[]> {
  const q = query.trim();
  if (!q) return getPersonalFoods(limit);
  const pattern = `%${q}%`;
  return db.select().from(personalFoods)
    .where(or(like(personalFoods.name, pattern), like(personalFoods.aliases, pattern)))
    .orderBy(desc(personalFoods.times_logged), asc(personalFoods.name))
    .limit(limit);
}

export async function insertPersonalFood(food: NewPersonalFood): Promise<void> {
  await db.insert(personalFoods).values(food);
}

export async function markPersonalFoodLogged(id: string): Promise<void> {
  const existing = await db.select({ times_logged: personalFoods.times_logged })
    .from(personalFoods)
    .where(like(personalFoods.id, id));
  if (!existing[0]) return;
  await db.update(personalFoods)
    .set({ times_logged: (existing[0].times_logged ?? 0) + 1, updated_at: new Date().toISOString() })
    .where(like(personalFoods.id, id));
}
