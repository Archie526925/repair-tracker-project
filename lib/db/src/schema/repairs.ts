import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statusEnum = pgEnum("status", [
  "pending",
  "in_progress",
  "completed",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const repairsTable = pgTable("repairs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  status: statusEnum("status").notNull().default("pending"),
  priority: priorityEnum("priority").notNull().default("medium"),
  description: text("description"),
  reportedBy: text("reported_by").notNull(),
  assignedTo: text("assigned_to"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
});

export const insertRepairSchema = createInsertSchema(repairsTable).omit({
  id: true,
  reportedAt: true,
});

export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairsTable.$inferSelect;
