import { Router } from "express";
import { and, gte, lt, eq } from "drizzle-orm";
import { db, repairsTable, categoriesTable } from "@workspace/db";
import { GetMonthlyStatsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/stats/monthly", async (req, res) => {
  try {
    const parsed = GetMonthlyStatsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query params" });
    }

    const monthStr =
      parsed.data.month ?? new Date().toISOString().slice(0, 7);

    const [year, mon] = monthStr.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const repairs = await db
      .select()
      .from(repairsTable)
      .where(and(gte(repairsTable.reportedAt, start), lt(repairsTable.reportedAt, end)));

    const byStatus = { pending: 0, in_progress: 0, completed: 0 };
    const byCategory: Record<string, number> = {};
    const byPriority = { low: 0, medium: 0, high: 0 };

    let totalResolutionMs = 0;
    let resolvedCount = 0;

    for (const r of repairs) {
      byStatus[r.status]++;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      byPriority[r.priority]++;

      if (r.status === "completed" && r.resolvedAt) {
        totalResolutionMs += r.resolvedAt.getTime() - r.reportedAt.getTime();
        resolvedCount++;
      }
    }

    const avgResolutionDays =
      resolvedCount > 0
        ? Math.round((totalResolutionMs / resolvedCount / (1000 * 60 * 60 * 24)) * 10) / 10
        : null;

    return res.json({
      month: monthStr,
      total: repairs.length,
      byStatus,
      byCategory,
      byPriority,
      avgResolutionDays,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/summary", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const all = await db.select().from(repairsTable);

    let pending = 0;
    let inProgress = 0;
    let completedThisMonth = 0;
    let highPriority = 0;

    for (const r of all) {
      if (r.status === "pending") pending++;
      if (r.status === "in_progress") inProgress++;
      if (r.status === "completed") {
        const checkDate = r.resolvedAt ?? r.reportedAt;
        if (checkDate >= startOfMonth && checkDate < startOfNextMonth) {
          completedThisMonth++;
        }
      }
      if (r.priority === "high" && r.status !== "completed") highPriority++;
    }

    return res.json({
      total: all.length,
      pending,
      inProgress,
      completedThisMonth,
      highPriority,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/trend", async (req, res) => {
  try {
    const trend = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const repairs = await db
        .select()
        .from(repairsTable)
        .where(and(gte(repairsTable.reportedAt, start), lt(repairsTable.reportedAt, end)));

      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const completed = repairs.filter((r) => r.status === "completed").length;
      const pending = repairs.filter((r) => r.status !== "completed").length;

      trend.push({ month, total: repairs.length, completed, pending });
    }

    return res.json(trend);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
