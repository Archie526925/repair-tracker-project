import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { adminOnly } from "../middlewares/auth";

const router = Router();

// List all users (admin only)
router.get("/admin/users", adminOnly, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    res.json(allUsers);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user role (admin only)
router.patch("/admin/users/:id/role", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["viewer", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role. Must be 'viewer' or 'admin'" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ id: updated.id, username: updated.username, role: updated.role });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
