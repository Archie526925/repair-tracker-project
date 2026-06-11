import app from "./app";
import { logger } from "./lib/logger";
import { initializeDatabase, db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initializeDatabase();

// Seed default categories if table is empty
const existingCats = await db.select().from(categoriesTable).limit(1);
if (existingCats.length === 0) {
  await db.insert(categoriesTable).values([
    { slug: "electrical", label: "電氣", color: "#eab308", sortOrder: 0 },
    { slug: "plumbing", label: "水管", color: "#3b82f6", sortOrder: 1 },
    { slug: "structural", label: "結構", color: "#f97316", sortOrder: 2 },
    { slug: "hvac", label: "空調", color: "#14b8a6", sortOrder: 3 },
    { slug: "furniture", label: "家具", color: "#a855f7", sortOrder: 4 },
    { slug: "other", label: "其他", color: "#6b7280", sortOrder: 5 },
  ]);
  logger.info("Seeded default categories");
}

// Seed admin user if no users exist
import { users } from "@workspace/db";
import bcrypt from "bcryptjs";
const existingUsers = await db.select().from(users).limit(1);
if (existingUsers.length === 0) {
  const password = process.env["ADMIN_PASSWORD"] || "admin123";
  const hash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    username: "admin",
    password: hash,
    role: "admin",
    displayName: "管理員",
  });
  logger.info("Seeded default admin user (username: admin)");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
