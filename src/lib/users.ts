import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userSettings, users } from "@/db/schema";

export async function ensureUser(email: string, name?: string) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const userId = randomUUID();
  const [user] = await db
    .insert(users)
    .values({ id: userId, email, name })
    .returning();

  await db
    .insert(userSettings)
    .values({
      id: randomUUID(),
      userId,
      defaultProvider: "codex",
      defaultMode: "balanced",
      settings: { theme: "system" },
    })
    .onConflictDoNothing();

  return user;
}
