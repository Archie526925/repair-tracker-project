import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || path.join(process.cwd(), "repair_tracker.db"),
  },
});
