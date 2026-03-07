import { db } from "./db.js";
import { users, appSettings } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import type { User, AppSettings } from "@shared/schema.js";

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

export async function updateLastLogin(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return result[0] ?? null;
}
