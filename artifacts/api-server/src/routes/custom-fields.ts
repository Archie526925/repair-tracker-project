import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, customFieldDefinitionsTable, repairCustomValuesTable, repairsTable } from "@workspace/db";
import {
  CreateCustomFieldBody,
  UpdateCustomFieldParams,
  UpdateCustomFieldBody,
  DeleteCustomFieldParams,
  SetRepairCustomValuesParams,
  SetRepairCustomValuesBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/custom-fields", async (req, res) => {
  try {
    const fields = await db
      .select()
      .from(customFieldDefinitionsTable)
      .orderBy(customFieldDefinitionsTable.sortOrder, customFieldDefinitionsTable.id);

    return res.json(
      fields.map((f) => ({
        ...f,
        fieldType: f.fieldType,
        options: f.options ?? null,
      })),
    );
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/custom-fields", async (req, res) => {
  try {
    const parsed = CreateCustomFieldBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const data = parsed.data;

    const existing = await db.select().from(customFieldDefinitionsTable);
    const sortOrder = existing.length;

    const [field] = await db
      .insert(customFieldDefinitionsTable)
      .values({
        name: data.name,
        fieldType: data.fieldType,
        options: data.options ?? null,
        required: data.required ?? false,
        sortOrder,
      })
      .returning();

    return res.status(201).json({
      ...field,
      options: field.options ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/custom-fields/:id", async (req, res) => {
  try {
    const paramsParsed = UpdateCustomFieldParams.safeParse({
      id: Number(req.params.id),
    });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const bodyParsed = UpdateCustomFieldBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.message });
    }

    const data = bodyParsed.data;
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.options !== undefined) updates.options = data.options;
    if (data.required !== undefined) updates.required = data.required;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const [field] = await db
      .update(customFieldDefinitionsTable)
      .set(updates)
      .where(eq(customFieldDefinitionsTable.id, paramsParsed.data.id))
      .returning();

    if (!field) {
      return res.status(404).json({ error: "Custom field not found" });
    }

    return res.json({ ...field, options: field.options ?? null });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/custom-fields/:id", async (req, res) => {
  try {
    const parsed = DeleteCustomFieldParams.safeParse({
      id: Number(req.params.id),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const result = await db
      .delete(customFieldDefinitionsTable)
      .where(eq(customFieldDefinitionsTable.id, parsed.data.id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Custom field not found" });
    }

    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/repairs/:id/custom-values", async (req, res) => {
  try {
    const paramsParsed = SetRepairCustomValuesParams.safeParse({
      id: Number(req.params.id),
    });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const bodyParsed = SetRepairCustomValuesBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.message });
    }

    const [repair] = await db
      .select()
      .from(repairsTable)
      .where(eq(repairsTable.id, paramsParsed.data.id));
    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    await db
      .delete(repairCustomValuesTable)
      .where(eq(repairCustomValuesTable.repairId, paramsParsed.data.id));

    const values = bodyParsed.data.values as Array<{ fieldId: number; value: string }>;
    if (values.length === 0) {
      return res.json([]);
    }

    const inserted = await db
      .insert(repairCustomValuesTable)
      .values(
        values.map((v) => ({
          repairId: paramsParsed.data.id,
          fieldId: v.fieldId,
          value: v.value,
        })),
      )
      .returning();

    return res.json(inserted);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
