import { Router, Response } from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  startSession,
  destroySession,
  getSessionStatus,
  updateSessionBot,
} from "../whatsapp/sessionManager";
import {
  getBotById,
  getMessageLogs,
  getSessionByUserId,
  updateSessionBot as dbUpdateSessionBot,
  upsertSession,
} from "../db/queries";

const router = Router();

router.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const connectSchema = z.object({
  bot_id: z.string().uuid("Invalid bot ID"),
});

const changeBotSchema = z.object({
  bot_id: z.string().uuid("Invalid bot ID"),
});

// ─── GET /api/whatsapp/status ─ Current session status ────────────────────────

router.get(
  "/status",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const liveStatus = getSessionStatus(req.userId!);
      const dbSession = await getSessionByUserId(req.userId!);

      res.json({
        status: liveStatus,
        phone: dbSession?.phone ?? null,
        bot_id: dbSession?.bot_id ?? null,
      });
    } catch (err) {
      console.error("Status error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/whatsapp/connect ─ Start session + stream QR via WS ────────────

router.post(
  "/connect",
  validate(connectSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { bot_id } = req.body as z.infer<typeof connectSchema>;
      const userId = req.userId!;

      // Verify the bot belongs to this user
      const bot = await getBotById(bot_id, userId);
      if (!bot) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      const currentStatus = getSessionStatus(userId);
      if (currentStatus === "connected") {
        res
          .status(409)
          .json({ error: "WhatsApp already connected. Disconnect first." });
        return;
      }

      // Kick off the session asynchronously — QR is pushed via WebSocket
      startSession(userId, bot_id).catch((err) =>
        console.error(`[WA] Session start error for ${userId}:`, err)
      );

      await upsertSession(userId, "connecting", null, bot_id);

      res.json({
        message:
          "Session initializing. Connect to the WebSocket endpoint to receive the QR code.",
        ws_path: "/ws",
      });
    } catch (err) {
      console.error("Connect error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/whatsapp/disconnect ─ Destroy session ──────────────────────────

router.post(
  "/disconnect",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await destroySession(req.userId!);
      res.json({ message: "WhatsApp disconnected successfully" });
    } catch (err) {
      console.error("Disconnect error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /api/whatsapp/bot ─ Change the active bot without reconnecting ────────

router.put(
  "/bot",
  validate(changeBotSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { bot_id } = req.body as z.infer<typeof changeBotSchema>;
      const userId = req.userId!;

      const bot = await getBotById(bot_id, userId);
      if (!bot) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      // Update in-memory session
      updateSessionBot(userId, bot_id);
      // Persist to DB
      await dbUpdateSessionBot(userId, bot_id);

      res.json({ message: "Active bot updated", bot_id });
    } catch (err) {
      console.error("Change bot error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/whatsapp/logs ─ Recent message logs ─────────────────────────────

router.get(
  "/logs",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const limit = Math.min(
        parseInt((req.query.limit as string) ?? "50", 10),
        200
      );
      const logs = await getMessageLogs(req.userId!, limit);
      res.json({ logs });
    } catch (err) {
      console.error("Logs error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
