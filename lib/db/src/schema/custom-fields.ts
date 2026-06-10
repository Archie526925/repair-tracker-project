import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { repairsTable } from "./repairs";

export const customFieldDefinitionsTable = sqliteTable("custom_field_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fieldType: text("field_type").notNull(),
  options: text("options"),
  required: integer("required", { mode: "boolean" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const repairCustomValuesTable = sqliteTable("repair_custom_values", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairId: integer("repair_id")
    .notNull()
    .references(() => repairsTable.id, { onDelete: "cascade" }),
  fieldId: integer("field_id")
    .notNull()
    .references(() => customFieldDefinitionsTable.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

export type CustomFieldDefinition =
  typeof customFieldDefinitionsTable.$inferSelect;
export type RepairCustomValue = typeof repairCustomValuesTable.$inferSelect;
