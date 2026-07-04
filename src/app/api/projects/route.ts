import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { mirroredProjects } from "@/db/schema";
import { ensureUser } from "@/lib/users";

const projectSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  cwd: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ projects: [], source: "mock" });
  }

  const db = getDb();
  const user = await ensureUser(email);
  const projects = await db
    .select()
    .from(mirroredProjects)
    .where(eq(mirroredProjects.userId, user.id));

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const parsed = projectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ project: parsed.data, source: "mock" }, { status: 201 });
  }

  const db = getDb();
  const user = await ensureUser(parsed.data.email);
  const values = {
    id: randomUUID(),
    userId: user.id,
    name: parsed.data.name,
    cwd: parsed.data.cwd,
    provider: "codex",
    metadata: parsed.data.metadata ?? {},
  };

  const [project] = await db
    .insert(mirroredProjects)
    .values(values)
    .onConflictDoUpdate({
      target: [mirroredProjects.userId, mirroredProjects.name],
      set: {
        cwd: values.cwd,
        provider: values.provider,
        metadata: values.metadata,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ project }, { status: 201 });
}
