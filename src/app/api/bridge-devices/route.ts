import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db/client";
import { bridgeDevices } from "@/db/schema";
import { ensureUser } from "@/lib/users";

const bridgeSchema = z.object({
  email: z.string().email(),
  deviceName: z.string().min(1).default("Local Codex Bridge"),
  status: z.string().default("connected"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ devices: [], source: "mock" });
  }

  const db = getDb();
  const user = await ensureUser(email);
  const devices = await db.select().from(bridgeDevices).where(eq(bridgeDevices.userId, user.id));

  return NextResponse.json({ devices });
}

export async function POST(request: Request) {
  const parsed = bridgeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ device: parsed.data, source: "mock" }, { status: 201 });
  }

  const db = getDb();
  const user = await ensureUser(parsed.data.email);
  const values = {
    id: randomUUID(),
    userId: user.id,
    deviceName: parsed.data.deviceName,
    status: parsed.data.status,
    lastSeenAt: new Date(),
    metadata: parsed.data.metadata ?? {},
  };

  const [device] = await db
    .insert(bridgeDevices)
    .values(values)
    .onConflictDoUpdate({
      target: [bridgeDevices.userId, bridgeDevices.deviceName],
      set: {
        status: values.status,
        lastSeenAt: values.lastSeenAt,
        metadata: values.metadata,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ device }, { status: 201 });
}
