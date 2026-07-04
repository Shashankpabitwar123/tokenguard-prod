import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { userSettings, users } from "@/db/schema";

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = userSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      user: {
        id: "local-user",
        email: parsed.data.email,
        name: parsed.data.name ?? null,
      },
      source: "mock",
    });
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);

  if (existing[0]) {
    return NextResponse.json({ user: existing[0], source: "database" });
  }

  const userId = randomUUID();
  const [user] = await db
    .insert(users)
    .values({ id: userId, email: parsed.data.email, name: parsed.data.name })
    .returning();

  await db
    .insert(userSettings)
    .values({
      id: randomUUID(),
      userId,
      defaultProvider: "codex",
      defaultMode: "balanced",
    })
    .onConflictDoNothing();

  return NextResponse.json({ user, source: "database" }, { status: 201 });
}
