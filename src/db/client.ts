import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!db) {
    db = drizzle(neon(process.env.DATABASE_URL), { schema });
  }

  return db;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
