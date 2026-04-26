import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type WarmlyDb = ReturnType<typeof createDb>;

export function createDb(url: string) {
  const sql = postgres(url, { prepare: false });
  return drizzle(sql, { schema });
}
