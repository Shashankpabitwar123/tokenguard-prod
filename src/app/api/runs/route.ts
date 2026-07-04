import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { optimizationRuns, users } from "@/db/schema";
import { buildOptimizedPrompt, DEFAULT_RULEBOOKS, estimateTokens } from "@/lib/defaults";

const runSchema = z.object({
  email: z.string().email(),
  title: z.string().optional(),
  prompt: z.string().min(1),
  provider: z.string().default("codex"),
  mode: z.string().default("balanced"),
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ runs: [], source: "mock" });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return NextResponse.json({ runs: [] });
  }

  const runs = await db
    .select()
    .from(optimizationRuns)
    .where(eq(optimizationRuns.userId, user.id))
    .orderBy(desc(optimizationRuns.createdAt))
    .limit(50);

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const parsed = runSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "email and prompt are required" }, { status: 400 });
  }

  const rulebook = DEFAULT_RULEBOOKS.find((item) => item.provider === parsed.data.provider);
  const tokens = estimateTokens(parsed.data.prompt, parsed.data.mode, parsed.data.provider);
  const optimizedPrompt = buildOptimizedPrompt({
    prompt: parsed.data.prompt,
    provider: parsed.data.provider,
    mode: parsed.data.mode,
    rules: rulebook?.rules ?? [],
  });

  const title = parsed.data.title ?? parsed.data.prompt.slice(0, 64);

  if (!hasDatabase()) {
    return NextResponse.json({
      run: {
        id: "local-run",
        userId: "local-user",
        title,
        provider: parsed.data.provider,
        mode: parsed.data.mode,
        originalPrompt: parsed.data.prompt,
        optimizedPrompt,
        originalTokens: tokens.originalTokens,
        optimizedTokens: tokens.optimizedTokens,
        savedPercent: tokens.savedPercent,
        status: "optimized",
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

  const [run] = await db
    .insert(optimizationRuns)
    .values({
      id: randomUUID(),
      userId: user.id,
      title,
      provider: parsed.data.provider,
      mode: parsed.data.mode,
      originalPrompt: parsed.data.prompt,
      optimizedPrompt,
      originalTokens: tokens.originalTokens,
      optimizedTokens: tokens.optimizedTokens,
      savedPercent: tokens.savedPercent,
      status: "optimized",
      metadata: { avoidedTokens: tokens.avoidedTokens },
    })
    .returning();

  return NextResponse.json({ run }, { status: 201 });
}
