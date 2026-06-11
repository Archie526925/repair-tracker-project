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
      groupId: users.groupId,
      createdAt: users.createdAt,
    }).from(users);
    res.json(
      allUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    );
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

// Update user password (admin only)
router.patch("/admin/users/:id/password", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ id: updated.id, username: updated.username });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user group (admin only)
router.patch("/admin/users/:id/group", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId } = req.body;

    if (groupId !== null && (typeof groupId !== "number" || groupId < 1)) {
      res.status(400).json({ error: "Invalid groupId" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ groupId: groupId ?? null })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ id: updated.id, username: updated.username, groupId: updated.groupId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user (admin only)
router.delete("/admin/users/:id", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?.userId === id) {
      res.status(400).json({ error: "不能刪除自己的帳號" });
      return;
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ id: deleted.id, username: deleted.username });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
