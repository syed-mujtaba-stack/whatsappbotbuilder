import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createUser, getUserByEmail, getUserById } from "../db/queries";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body as z.infer<
        typeof registerSchema
      >;

      const existing = await getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await createUser(email, hashedPassword, name);
      const token = signToken(user.id);

      res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;

      const user = await getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = signToken(user.id);

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await getUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error("Get me error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
