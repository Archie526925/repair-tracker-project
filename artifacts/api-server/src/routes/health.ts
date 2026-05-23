import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  try {
    // Basic DB check to catch missing/invalid DATABASE_URL or missing schema in prod.
    const result = await pool.query<{
      repairs: string | null;
      categories: string | null;
      custom_field_definitions: string | null;
      repair_custom_values: string | null;
    }>(`
      SELECT
        to_regclass('public.repairs') as repairs,
        to_regclass('public.categories') as categories,
        to_regclass('public.custom_field_definitions') as custom_field_definitions,
        to_regclass('public.repair_custom_values') as repair_custom_values
    `);

    const tables = result.rows[0] ?? null;
    const data = HealthCheckResponse.parse({ status: "ok" });

    return res.json({ ...data, db: { ok: true, tables } });
  } catch (err) {
    req.log.error(err);
    return res
      .status(500)
      .json({ status: "error", db: { ok: false } });
  }
});

export default router;
