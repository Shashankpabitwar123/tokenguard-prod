import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { pinnedThreads } from "@/db/schema";
import { ensureUser } from "@/lib/users";

const pinSchema = z.object({
  email: z.string().email(),
  provider: z.string().default("codex"),
  threadId: z.string().min(1),
  title: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ pins: [], source: "mock" });
  }

  const db = getDb();
  const user = await ensureUser(email);
  const pins = await db.select().from(pinnedThreads).where(eq(pinnedThreads.userId, user.id));

  return NextResponse.json({ pins });
}

export async function POST(request: Request) {
  const parsed = pinSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "email, threadId, and title are required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ pin: parsed.data, source: "mock" }, { status: 201 });
  }

  const db = getDb();
  const user = await ensureUser(parsed.data.email);
  const values = {
    id: randomUUID(),
    userId: user.id,
    provider: parsed.data.provider,
    threadId: parsed.data.threadId,
    title: parsed.data.title,
    metadata: parsed.data.metadata ?? {},
  };

  const [pin] = await db
    .insert(pinnedThreads)
    .values(values)
    .onConflictDoUpdate({
      target: [pinnedThreads.userId, pinnedThreads.provider, pinnedThreads.threadId],
      set: { title: values.title, metadata: values.metadata, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({ pin }, { status: 201 });
}

export async function DELETE(request: Request) {
  const parsed = pinSchema.pick({ email: true, provider: true, threadId: true }).safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "email and threadId are required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, source: "mock" });
  }

  const db = getDb();
  const user = await ensureUser(parsed.data.email);
  await db
    .delete(pinnedThreads)
    .where(
      and(
        eq(pinnedThreads.userId, user.id),
        eq(pinnedThreads.provider, parsed.data.provider ?? "codex"),
        eq(pinnedThreads.threadId, parsed.data.threadId),
      ),
    );

  return NextResponse.json({ ok: true });
}
