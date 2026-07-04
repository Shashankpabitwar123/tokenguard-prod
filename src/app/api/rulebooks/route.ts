import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, hasDatabase } from "@/db/client";
import { providerRulebooks } from "@/db/schema";
import { DEFAULT_RULEBOOKS } from "@/lib/defaults";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ rulebooks: DEFAULT_RULEBOOKS, source: "defaults" });
  }

  const db = getDb();
  const rows = await db.select().from(providerRulebooks);

  if (rows.length === 0) {
    await db
      .insert(providerRulebooks)
      .values(
        DEFAULT_RULEBOOKS.map((rulebook) => ({
          id: randomUUID(),
          provider: rulebook.provider,
          displayName: rulebook.displayName,
          description: rulebook.description,
          rules: rulebook.rules,
        })),
      )
      .onConflictDoNothing();

    return NextResponse.json({
      rulebooks: await db.select().from(providerRulebooks),
      source: "seeded",
    });
  }

  return NextResponse.json({ rulebooks: rows, source: "database" });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const provider = String(body.provider ?? "");
  const rules = Array.isArray(body.rules) ? body.rules.map(String) : [];

  if (!provider || rules.length === 0) {
    return NextResponse.json({ error: "provider and rules are required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, provider, rules, source: "mock" });
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(providerRulebooks)
    .where(eq(providerRulebooks.provider, provider))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(providerRulebooks)
      .set({ rules, updatedAt: new Date() })
      .where(eq(providerRulebooks.provider, provider))
      .returning();
    return NextResponse.json({ rulebook: updated });
  }

  const [created] = await db
    .insert(providerRulebooks)
    .values({
      id: randomUUID(),
      provider,
      displayName: String(body.displayName ?? provider),
      description: String(body.description ?? ""),
      rules,
    })
    .returning();

  return NextResponse.json({ rulebook: created }, { status: 201 });
}
