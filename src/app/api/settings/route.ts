import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { userSettings, users } from "@/db/schema";

const settingsSchema = z.object({
  email: z.string().email(),
  defaultProvider: z.string().optional(),
  defaultMode: z.string().optional(),
  showSavingsMeter: z.boolean().optional(),
  showCostSaved: z.boolean().optional(),
  saveHistory: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      settings: {
        userId: "local-user",
        defaultProvider: "codex",
        defaultMode: "balanced",
        showSavingsMeter: true,
        showCostSaved: true,
        saveHistory: true,
      },
      source: "mock",
    });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1);

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const parsed = settingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ settings: parsed.data, source: "mock" });
  }

  const db = getDb();
  let [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({ id: randomUUID(), email: parsed.data.email })
      .returning();
  }

  const values = {
    id: randomUUID(),
    userId: user.id,
    defaultProvider: parsed.data.defaultProvider ?? "codex",
    defaultMode: parsed.data.defaultMode ?? "balanced",
    showSavingsMeter: parsed.data.showSavingsMeter === false ? 0 : 1,
    showCostSaved: parsed.data.showCostSaved === false ? 0 : 1,
    saveHistory: parsed.data.saveHistory === false ? 0 : 1,
    settings: parsed.data.settings ?? {},
  };

  const [settings] = await db
    .insert(userSettings)
    .values(values)
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, id: undefined, userId: undefined, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ settings });
}
