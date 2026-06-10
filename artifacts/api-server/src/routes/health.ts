import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  try {
    // Basic DB check — SQLite version
    await db.run(sql`SELECT 1`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    return res.json({ ...data, db: { ok: true } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ status: "error", db: { ok: false } });
  }
});

export default router;
