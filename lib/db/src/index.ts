import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

export async function initializeDatabase() {
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE status AS ENUM ('pending', 'in_progress', 'completed');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE field_type AS ENUM ('text', 'number', 'select', 'date');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS repairs (
      id serial PRIMARY KEY,
      title text NOT NULL,
      location text NOT NULL,
      category text NOT NULL,
      status status NOT NULL DEFAULT 'pending',
      priority priority NOT NULL DEFAULT 'medium',
      description text,
      reported_by text NOT NULL,
      assigned_to text,
      reported_at timestamp NOT NULL DEFAULT now(),
      resolved_at timestamp,
      notes text
    );

    CREATE TABLE IF NOT EXISTS categories (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      label text NOT NULL,
      color text NOT NULL DEFAULT '#6b7280',
      sort_order integer NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id serial PRIMARY KEY,
      name text NOT NULL,
      field_type field_type NOT NULL,
      options text[],
      required boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS repair_custom_values (
      id serial PRIMARY KEY,
      repair_id integer NOT NULL REFERENCES repairs(id) ON DELETE cascade,
      field_id integer NOT NULL REFERENCES custom_field_definitions(id) ON DELETE cascade,
      value text NOT NULL
    );
  `);
}
