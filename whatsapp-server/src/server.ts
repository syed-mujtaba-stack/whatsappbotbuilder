import dotenv from "dotenv";
dotenv.config(); // must be first — loads .env before any other module reads process.env

import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { runMigrations } from "./db/schema";
import { subscribeWs } from "./whatsapp/sessionManager";
import authRoutes from "./routes/auth";
import botRoutes from "./routes/bots";
import whatsappRoutes from "./routes/whatsapp";
import jwt from "jsonwebtoken";

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();

// Build allowed origins list — strip trailing slashes, support comma-separated values
const rawOrigins = process.env.FRONTEND_URL ?? "http://localhost:3000";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Render health checks, curl, etc.)
      if (!origin) return callback(null, true);
      // Strip trailing slash from incoming origin before comparing
      const clean = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(clean)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  // Expect token as query param: ws://host/ws?token=<jwt>
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(1008, "Token required");
    return;
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { userId: string };
    const userId = payload.userId;

    console.log(`[WS] Client connected: userId=${userId}`);
    subscribeWs(userId, ws);

    ws.on("close", () => {
      console.log(`[WS] Client disconnected: userId=${userId}`);
    });
  } catch {
    ws.close(1008, "Invalid token");
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function bootstrap(): Promise<void> {
  try {
    await runMigrations();

    server.listen(PORT, () => {
      console.log(`\n🚀 WhatsApp Agent server running on port ${PORT}`);
      console.log(`   REST API : http://localhost:${PORT}/api`);
      console.log(`   WebSocket: ws://localhost:${PORT}/ws?token=<jwt>`);
      console.log(`   Health   : http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

bootstrap();
