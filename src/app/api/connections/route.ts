import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { providerConnections, users } from "@/db/schema";

const connectionSchema = z.object({
  email: z.string().email(),
  provider: z.enum(["codex", "chatgpt", "claude", "gemini", "local"]),
});

export async function POST(request: Request) {
  const parsed = connectionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "email and provider are required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      connection: {
        id: "local-connection",
        userId: "local-user",
        provider: parsed.data.provider,
        status: "connected",
        accountEmail: parsed.data.email,
      },
      source: "mock",
    });
  }

  const db = getDb();
  let [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({ id: randomUUID(), email: parsed.data.email })
      .returning();
  }

  const existing = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.userId, user.id),
        eq(providerConnections.provider, parsed.data.provider),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(providerConnections)
      .set({ status: "connected", accountEmail: parsed.data.email, updatedAt: new Date() })
      .where(eq(providerConnections.id, existing[0].id))
      .returning();
    return NextResponse.json({ connection: updated, user });
  }

  const [connection] = await db
    .insert(providerConnections)
    .values({
      id: randomUUID(),
      userId: user.id,
      provider: parsed.data.provider,
      status: "connected",
      accountEmail: parsed.data.email,
    })
    .returning();

  return NextResponse.json({ connection, user }, { status: 201 });
}
