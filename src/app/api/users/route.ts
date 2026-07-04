import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { ensureUser } from "@/lib/users";

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

  const user = await ensureUser(parsed.data.email, parsed.data.name);
  return NextResponse.json({ user, source: "database" }, { status: 201 });
}
