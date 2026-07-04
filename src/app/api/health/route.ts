import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/client";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "tokenguard",
    database: hasDatabase() ? "configured" : "not_configured",
  });
}
