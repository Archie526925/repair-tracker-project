import { pgTable, serial, text, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { repairsTable } from "./repairs";

export const fieldTypeEnum = pgEnum("field_type", [
  "text",
  "number",
  "select",
  "date",
]);

export const customFieldDefinitionsTable = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  options: text("options").array(),
  required: boolean("required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const repairCustomValuesTable = pgTable("repair_custom_values", {
  id: serial("id").primaryKey(),
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
