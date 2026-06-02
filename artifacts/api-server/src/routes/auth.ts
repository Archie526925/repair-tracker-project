import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { users } from "@workspace/db";

const router = Router();
const JWT_SECRET=process.env.JWT_SECRET || "super-secret-key-change-this-in-prod";

// Register
router.post("/register", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.insert(users).values({
      username,
      password: hashedPassword,
    }).returning();

    if (!newUser[0]) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    res.status(201).json({
      message: "User created successfully",
      user: { id: newUser[0].id, username: newUser[0].username },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

// Login
router.post("/login", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      res.status(400).json({ error: "Invalid username or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ error: "Invalid username or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
