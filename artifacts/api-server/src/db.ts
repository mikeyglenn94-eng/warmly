import { createDb, type WarmlyDb } from "@warmly/db";

let cached: WarmlyDb | null = null;

export function db(): WarmlyDb {
  if (cached) return cached;
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");
  cached = createDb(url);
  return cached;
}
