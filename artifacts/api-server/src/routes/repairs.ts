import { Router } from "express";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db, repairsTable, repairCustomValuesTable } from "@workspace/db";
import { AuthRequest } from "../middlewares/auth";
import {
  CreateRepairBody,
  UpdateRepairBody,
  GetRepairParams,
  UpdateRepairParams,
  DeleteRepairParams,
  ListRepairsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/repairs", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const parsed = ListRepairsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query params" });
    }
    const { status, category, priority, month } = parsed.data;

    const conditions = [];

    // Group isolation: only see repairs in own group (or all if no group)
    if (authReq.user?.groupId != null) {
      conditions.push(eq(repairsTable.groupId, authReq.user.groupId));
    }

    if (status) conditions.push(eq(repairsTable.status, status));
    if (category) conditions.push(eq(repairsTable.category, category));
    if (priority) conditions.push(eq(repairsTable.priority, priority));
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      conditions.push(gte(repairsTable.reportedAt, start));
      conditions.push(lt(repairsTable.reportedAt, end));
    }

    const repairs = await db
      .select({
        id: repairsTable.id,
        title: repairsTable.title,
        location: repairsTable.location,
        category: repairsTable.category,
        priority: repairsTable.priority,
        status: repairsTable.status,
        description: repairsTable.description,
        reportedBy: repairsTable.reportedBy,
        reportedAt: repairsTable.reportedAt,
        assignedTo: repairsTable.assignedTo,
        notes: repairsTable.notes,
        resolvedAt: repairsTable.resolvedAt,
        rowNumber: sql<number>`ROW_NUMBER() OVER (ORDER BY ${repairsTable.reportedAt} DESC)`,
      })
      .from(repairsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${repairsTable.reportedAt} DESC`);

    return res.json(
      repairs.map((r) => ({
        ...r,
        reportedAt: r.reportedAt.toISOString(),
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      })),
    );
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/repairs", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const parsed = CreateRepairBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const data = parsed.data;

    const [repair] = await db
      .insert(repairsTable)
      .values({
        title: data.title,
        location: data.location,
        category: data.category,
        priority: data.priority,
        description: data.description ?? null,
        reportedBy: data.reportedBy,
        reportedAt: data.reportedAt ?? new Date(),
        assignedTo: data.assignedTo ?? null,
        notes: data.notes ?? null,
        groupId: authReq.user?.groupId ?? null,
      })
      .returning();

    return res.status(201).json({
      ...repair,
      reportedAt: repair.reportedAt.toISOString(),
      resolvedAt: repair.resolvedAt ? repair.resolvedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/repairs/:id", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const parsed = GetRepairParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const conditions = [eq(repairsTable.id, parsed.data.id)];
    if (authReq.user?.groupId != null) {
      conditions.push(eq(repairsTable.groupId, authReq.user.groupId));
    }

    const [repair] = await db
      .select({
        id: repairsTable.id,
        title: repairsTable.title,
        location: repairsTable.location,
        category: repairsTable.category,
        priority: repairsTable.priority,
        status: repairsTable.status,
        description: repairsTable.description,
        reportedBy: repairsTable.reportedBy,
        reportedAt: repairsTable.reportedAt,
        assignedTo: repairsTable.assignedTo,
        notes: repairsTable.notes,
        resolvedAt: repairsTable.resolvedAt,
        rowNumber: sql<number>`ROW_NUMBER() OVER (ORDER BY ${repairsTable.reportedAt} DESC)`,
      })
      .from(repairsTable)
      .where(and(...conditions));

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    return res.json({
      ...repair,
      reportedAt: repair.reportedAt.toISOString(),
      resolvedAt: repair.resolvedAt ? repair.resolvedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/repairs/:id", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const paramsParsed = UpdateRepairParams.safeParse({
      id: Number(req.params.id),
    });
    if (!paramsParsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const bodyParsed = UpdateRepairBody.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ error: bodyParsed.error.message });
    }

    const updates: Record<string, unknown> = {};
    const data = bodyParsed.data;
    if (data.title !== undefined) updates.title = data.title;
    if (data.location !== undefined) updates.location = data.location;
    if (data.category !== undefined) updates.category = data.category;
    if (data.status !== undefined) updates.status = data.status;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.description !== undefined) updates.description = data.description;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.resolvedAt !== undefined) {
      updates.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;
    }

    if (Object.keys(updates).length === 0) {
      const [existing] = await db
        .select()
        .from(repairsTable)
        .where(and(eq(repairsTable.id, paramsParsed.data.id), ...(authReq.user?.groupId != null ? [eq(repairsTable.groupId, authReq.user.groupId)] : [])));
      if (!existing) return res.status(404).json({ error: "Repair not found" });
      return res.json({
        ...existing,
        reportedAt: existing.reportedAt.toISOString(),
        resolvedAt: existing.resolvedAt
          ? existing.resolvedAt.toISOString()
          : null,
      });
    }

    const patchConditions = [eq(repairsTable.id, paramsParsed.data.id)];
    if (authReq.user?.groupId != null) {
      patchConditions.push(eq(repairsTable.groupId, authReq.user.groupId));
    }

    const [repair] = await db
      .update(repairsTable)
      .set(updates)
      .where(and(...patchConditions))
      .returning();

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    return res.json({
      ...repair,
      reportedAt: repair.reportedAt.toISOString(),
      resolvedAt: repair.resolvedAt ? repair.resolvedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/repairs/:id/custom-values", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [repair] = await db.select().from(repairsTable).where(eq(repairsTable.id, id));
    if (!repair) return res.status(404).json({ error: "Repair not found" });
    const values = await db
      .select()
      .from(repairCustomValuesTable)
      .where(eq(repairCustomValuesTable.repairId, id));
    return res.json(values);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/repairs/:id", async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const parsed = DeleteRepairParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const deleteConditions = [eq(repairsTable.id, parsed.data.id)];
    if (authReq.user?.groupId != null) {
      deleteConditions.push(eq(repairsTable.groupId, authReq.user.groupId));
    }

    const result = await db
      .delete(repairsTable)
      .where(and(...deleteConditions))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Repair not found" });
    }

    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
