import { Router, Response } from "express";
import { z } from "zod";
import {
  createBot,
  getBotsByUserId,
  getBotById,
  updateBot,
  deleteBot,
} from "../db/queries";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// All bot routes require authentication
router.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  "google/gemma-4-27b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "z-ai/glm-5.2:free",
  "openai/gpt-oss-20b:free",
] as const;

const botSchema = z.object({
  name: z
    .string()
    .min(1, "Bot name is required")
    .max(50, "Name must be under 50 characters"),
  system_prompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters")
    .max(2000, "System prompt must be under 2000 characters"),
  model: z
    .enum(AVAILABLE_MODELS)
    .default("google/gemma-4-27b-it:free"),
  allowed_numbers: z
    .array(
      z
        .string()
        .regex(
          /^\d{10,15}$/,
          "Each number must be 10-15 digits (no + or spaces)"
        )
    )
    .default([]),
});

// ─── GET /api/bots ─ List all bots for logged-in user ─────────────────────────

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bots = await getBotsByUserId(req.userId!);
    res.json({ bots });
  } catch (err) {
    console.error("List bots error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/bots ─ Create a new bot ────────────────────────────────────────

router.post(
  "/",
  validate(botSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, system_prompt, model, allowed_numbers } =
        req.body as z.infer<typeof botSchema>;

      const bot = await createBot(
        req.userId!,
        name,
        system_prompt,
        model,
        allowed_numbers
      );

      res.status(201).json({ bot });
    } catch (err) {
      console.error("Create bot error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/bots/:id ─ Get single bot ───────────────────────────────────────

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bot = await getBotById(req.params.id, req.userId!);

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    res.json({ bot });
  } catch (err) {
    console.error("Get bot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/bots/:id ─ Update bot ───────────────────────────────────────────

router.put(
  "/:id",
  validate(botSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, system_prompt, model, allowed_numbers } =
        req.body as z.infer<typeof botSchema>;

      const bot = await updateBot(
        req.params.id,
        req.userId!,
        name,
        system_prompt,
        model,
        allowed_numbers
      );

      if (!bot) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      res.json({ bot });
    } catch (err) {
      console.error("Update bot error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── DELETE /api/bots/:id ─ Delete bot ────────────────────────────────────────

router.delete(
  "/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const deleted = await deleteBot(req.params.id, req.userId!);

      if (!deleted) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      res.json({ message: "Bot deleted successfully" });
    } catch (err) {
      console.error("Delete bot error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/bots/meta/models ─ Available free models ────────────────────────

router.get(
  "/meta/models",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({
      models: AVAILABLE_MODELS.map((m) => ({
        id: m,
        label: m.split("/")[1].replace(":free", "").replace(/-/g, " "),
      })),
    });
  }
);

export default router;
