import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router = Router();

const DEFAULT_CATEGORIES = [
  { slug: "electrical", label: "電氣", color: "#eab308", sortOrder: 0 },
  { slug: "plumbing", label: "水管", color: "#3b82f6", sortOrder: 1 },
  { slug: "structural", label: "結構", color: "#f97316", sortOrder: 2 },
  { slug: "hvac", label: "空調", color: "#14b8a6", sortOrder: 3 },
  { slug: "furniture", label: "家具", color: "#a855f7", sortOrder: 4 },
  { slug: "other", label: "其他", color: "#6b7280", sortOrder: 5 },
];

async function ensureDefaults() {
  const existing = await db.select().from(categoriesTable);
  if (existing.length === 0) {
    await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
  }
}

router.get("/categories", async (req, res) => {
  try {
    await ensureDefaults();
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
    return res.json(categories);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const { slug, label, color, sortOrder } = parsed.data;

    const existing = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug));
    if (existing.length > 0) {
      return res.status(400).json({ error: "此代碼已存在" });
    }

    const allCategories = await db.select().from(categoriesTable);
    const nextOrder = sortOrder ?? allCategories.length;

    const [cat] = await db
      .insert(categoriesTable)
      .values({
        slug,
        label,
        color: color ?? "#6b7280",
        sortOrder: nextOrder,
      })
      .returning();

    return res.status(201).json(cat);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const paramsParsed = UpdateCategoryParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const bodyParsed = UpdateCategoryBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.message });
    }

    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.label !== undefined) updates.label = bodyParsed.data.label;
    if (bodyParsed.data.color !== undefined) updates.color = bodyParsed.data.color;
    if (bodyParsed.data.sortOrder !== undefined) updates.sortOrder = bodyParsed.data.sortOrder;

    if (Object.keys(updates).length === 0) {
      const [cat] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, paramsParsed.data.id));
      if (!cat) return res.status(404).json({ error: "Not found" });
      return res.json(cat);
    }

    const [cat] = await db
      .update(categoriesTable)
      .set(updates)
      .where(eq(categoriesTable.id, paramsParsed.data.id))
      .returning();

    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const parsed = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const result = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, parsed.data.id))
      .returning();

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
