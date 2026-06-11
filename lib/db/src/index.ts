import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { sql } from "drizzle-orm";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "repair_tracker.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase(): Promise<void> {
  // Create tables if they don't exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      group_id INTEGER REFERENCES groups(id),
      display_name TEXT,
      created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
      updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reported_at INTEGER NOT NULL,
      resolved_at INTEGER,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      assigned_to TEXT,
      group_id INTEGER REFERENCES groups(id),
      created_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
      updated_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options TEXT,
      required INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS repair_custom_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
      value TEXT NOT NULL
    )
  `);
}

export * from "./schema/repairs";
export * from "./schema/custom-fields";
export * from "./schema/categories";
export * from "./schema/users";
export * from "./schema/groups";
