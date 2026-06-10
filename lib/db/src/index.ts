import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "repair_tracker.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase(): Promise<void> {
  // SQLite connects automatically on construction; no pool initialization needed.
  // Kept as a no-op for compatibility with API server startup sequence.
  return Promise.resolve();
}

export * from "./schema/repairs";
export * from "./schema/custom-fields";
export * from "./schema/categories";
export * from "./schema/users";
export * from "./schema/groups";
