import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, groups, repairsTable, users } from "@workspace/db";
import { adminOnly, AuthRequest } from "../middlewares/auth";

const router = Router();

// List groups (admin only)
router.get("/groups", adminOnly, async (req, res) => {
  try {
    const allGroups = await db.select().from(groups).orderBy(groups.name);
    return res.json(
      allGroups.map((g) => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/groups", adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }

    const [group] = await db.insert(groups).values({
      name: name.trim(),
      description: description ?? null,
    }).returning();
    return res.status(201).json(group);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/groups/:id", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, description } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [group] = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();

    if (!group) return res.status(404).json({ error: "Group not found" });
    return res.json(group);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/groups/:id", adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    // 1. 先刪該群組的所有報修紀錄
    await db.delete(repairsTable).where(eq(repairsTable.groupId, id));

    // 2. 把該群組的使用者的 group_id 設為 null
    await db.update(users).set({ groupId: null }).where(eq(users.groupId, id));

    // 3. 刪除群組
    const result = await db.delete(groups).where(eq(groups.id, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: "Group not found" });

    return res.status(200).json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
