import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { groups } from "./groups";

export const repairsTable = sqliteTable("repairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  reportedBy: text("reported_by").notNull(),
  assignedTo: text("assigned_to"),
  reportedAt: integer("reported_at", { mode: "timestamp" }).notNull().defaultNow(),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  notes: text("notes"),
  groupId: integer("group_id").references(() => groups.id),
});

export const insertRepairSchema = createInsertSchema(repairsTable).omit({
  id: true,
  reportedAt: true,
});

export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairsTable.$inferSelect;
