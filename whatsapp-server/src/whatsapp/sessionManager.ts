import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";
import {
  getBotById,
  getSessionByUserId,
  logMessage,
  updateSessionStatus,
  upsertSession,
} from "../db/queries";
import { generateReply, isNumberAllowed } from "./aiHandler";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionEntry {
  client: Client;
  userId: string;
  botId: string | null;
  status: "connecting" | "connected" | "disconnected";
  lastReply: Map<string, number>;
}

// ─── Stores ───────────────────────────────────────────────────────────────────

const sessions = new Map<string, SessionEntry>();
const wsSubscribers = new Map<string, WebSocket>();

// ─── Anti-ban constants ───────────────────────────────────────────────────────

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MIN_REPLY_DELAY_MS = 2_000;
const MAX_REPLY_DELAY_MS = 5_000;
const PER_SENDER_COOLDOWN_MS = 8_000;

const AUTH_DIR = path.resolve(".wwebjs_auth");

// ─── WebSocket helpers ────────────────────────────────────────────────────────

export function subscribeWs(userId: string, ws: WebSocket): void {
  wsSubscribers.set(userId, ws);
  ws.on("close", () => wsSubscribers.delete(userId));
}

function sendWs(userId: string, payload: object): void {
  const ws = wsSubscribers.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
  );
}

// ─── Lockfile cleanup ─────────────────────────────────────────────────────────

/**
 * Force-remove the Chromium lockfile so a fresh session can start.
 * Called after LOGOUT or any unclean disconnect.
 */
function clearLockfile(userId: string): void {
  const lockPath = path.join(
    AUTH_DIR,
    `session-${userId}`,
    "lockfile"
  );
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log(`[WA] Lockfile removed for ${userId}`);
    }
  } catch (err) {
    // On Windows the file may still be held briefly — ignore, next attempt will clear it
    console.warn(`[WA] Could not remove lockfile (will retry on next connect):`, err);
  }
}

/**
 * Wait until the lockfile is gone or timeout expires.
 * Useful after destroy() when Windows holds the file for a moment.
 */
async function waitForLockRelease(
  userId: string,
  timeoutMs = 8_000
): Promise<void> {
  const lockPath = path.join(AUTH_DIR, `session-${userId}`, "lockfile");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!fs.existsSync(lockPath)) return;
    await new Promise((r) => setTimeout(r, 500));
    try { fs.unlinkSync(lockPath); return; } catch { /* still locked */ }
  }
  console.warn(`[WA] Lockfile still present after ${timeoutMs}ms for ${userId}`);
}

// ─── Chrome executable path ───────────────────────────────────────────────────

function getChromePath(): string | undefined {
  // 1. Explicit env override
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  // 2. Puppeteer's downloaded Chrome via .puppeteerrc.cjs cache dir
  //    Render path: <project_root>/.cache/puppeteer/chrome/linux-xxx/chrome-linux64/chrome
  try {
    const cacheDir = path.join(__dirname, "..", "..", ".cache", "puppeteer");
    if (fs.existsSync(cacheDir)) {
      // Walk chrome/linux-* dirs to find the executable
      const chromeDir = path.join(cacheDir, "chrome");
      if (fs.existsSync(chromeDir)) {
        const versions = fs.readdirSync(chromeDir);
        for (const ver of versions) {
          const candidates = [
            path.join(chromeDir, ver, "chrome-linux64", "chrome"),
            path.join(chromeDir, ver, "chrome-linux", "chrome"),
            path.join(chromeDir, ver, "chrome-win64", "chrome.exe"),
            path.join(chromeDir, ver, "chrome-win32", "chrome.exe"),
          ];
          for (const c of candidates) {
            if (fs.existsSync(c)) return c;
          }
        }
      }
    }
  } catch { /* ignore */ }

  // 3. puppeteer package executablePath()
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { executablePath } = require("puppeteer") as { executablePath: () => string };
    const p = executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch { /* not available */ }

  // 4. System Chrome on Linux (Render, Ubuntu, Debian)
  const linuxPaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  // 5. Let puppeteer-core try its own default (Windows local dev)
  return undefined;
}

// ─── Client factory ───────────────────────────────────────────────────────────

function buildClient(userId: string): Client {
  const executablePath = getChromePath();
  if (executablePath) {
    console.log(`[WA] Using Chrome: ${executablePath}`);
  }

  return new Client({
    authStrategy: new LocalAuth({
      clientId: userId,
      dataPath: AUTH_DIR,
    }),
    puppeteer: {
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--no-first-run",
        "--no-zygote",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--window-size=1280,800",
        "--disable-blink-features=AutomationControlled",
      ],
      timeout: 90_000,
    },
    userAgent: USER_AGENT,
    webVersionCache: { type: "local" },
  });
}

// ─── Session start ────────────────────────────────────────────────────────────

export async function startSession(
  userId: string,
  botId: string
): Promise<void> {
  // If a session already exists in memory, fully destroy it first
  if (sessions.has(userId)) {
    const existing = sessions.get(userId)!;
    if (existing.status !== "disconnected") {
      await destroySession(userId);
    } else {
      sessions.delete(userId);
    }
  }

  // Wait for Windows to release the lockfile from the previous process
  await waitForLockRelease(userId);
  // Try one more explicit removal in case waitFor left it
  clearLockfile(userId);

  const client = buildClient(userId);

  const entry: SessionEntry = {
    client,
    userId,
    botId,
    status: "connecting",
    lastReply: new Map(),
  };

  sessions.set(userId, entry);
  await upsertSession(userId, "connecting", null, botId);

  // ── QR ────────────────────────────────────────────────────────────────────
  client.on("qr", async (qr: string) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { scale: 6 });
      sendWs(userId, { type: "qr", qr: qrDataUrl });
      console.log(`[WA] QR generated for ${userId}`);
    } catch (err) {
      console.error("[WA] QR generation failed:", err);
    }
  });

  // ── Ready ─────────────────────────────────────────────────────────────────
  client.on("ready", async () => {
    entry.status = "connected";
    const phone = client.info?.wid?.user ?? null;
    await updateSessionStatus(userId, "connected", phone);
    sendWs(userId, { type: "status", status: "connected", phone });
    console.log(`[WA] Connected — user ${userId} phone ${phone}`);
  });

  // ── Auth failure ──────────────────────────────────────────────────────────
  client.on("auth_failure", async (msg: string) => {
    console.error(`[WA] Auth failure for ${userId}:`, msg);
    entry.status = "disconnected";
    await updateSessionStatus(userId, "disconnected");
    sendWs(userId, { type: "status", status: "disconnected" });
    sessions.delete(userId);
    clearLockfile(userId);
  });

  // ── Disconnected (includes LOGOUT) ────────────────────────────────────────
  client.on("disconnected", async (reason: string) => {
    console.warn(`[WA] Disconnected for ${userId}: ${reason}`);
    entry.status = "disconnected";
    await updateSessionStatus(userId, "disconnected");
    sendWs(userId, { type: "status", status: "disconnected", reason });

    // Gracefully destroy the browser process, then clean up lockfile
    try {
      await client.destroy();
    } catch {
      // ignore — may already be gone
    }
    sessions.delete(userId);
    // Small delay so the OS releases file handles before we delete the lock
    setTimeout(() => clearLockfile(userId), 1_500);
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  client.on("message", async (msg: Message) => {
    await handleIncomingMessage(entry, msg);
  });

  // Non-blocking initialize
  client.initialize().catch((err: Error) => {
    console.error(`[WA] initialize() error for ${userId}:`, err.message);
    entry.status = "disconnected";
    updateSessionStatus(userId, "disconnected");
    sendWs(userId, { type: "status", status: "disconnected" });
    sessions.delete(userId);
    // Clean up lockfile so next connect attempt works cleanly
    setTimeout(() => clearLockfile(userId), 1_500);
  });
}

// ─── Message handler ──────────────────────────────────────────────────────────

async function handleIncomingMessage(
  entry: SessionEntry,
  msg: Message
): Promise<void> {
  const { userId, botId } = entry;

  if (msg.from.endsWith("@g.us")) return;
  if (msg.from === "status@broadcast") return;
  if (msg.fromMe) return;
  if (!msg.body?.trim()) return;

  // Per-sender cooldown
  const now = Date.now();
  const lastTime = entry.lastReply.get(msg.from) ?? 0;
  if (now - lastTime < PER_SENDER_COOLDOWN_MS) {
    console.log(`[WA] Cooldown active for ${msg.from}`);
    return;
  }

  try {
    if (!botId) return;

    const bot = await getBotById(botId, userId);
    if (!bot || !bot.is_active) return;

    if (!isNumberAllowed(bot, msg.from)) {
      console.log(`[WA] ${msg.from} not in allowed list`);
      return;
    }

    const reply = await generateReply(bot, msg.body);
    if (!reply) return;

    // Simulate human: mark seen → wait → reply
    await entry.client.sendPresenceAvailable();
    await entry.client.sendSeen(msg.from);
    await randomDelay(MIN_REPLY_DELAY_MS, MAX_REPLY_DELAY_MS);

    await msg.reply(reply);
    entry.lastReply.set(msg.from, Date.now());

    await logMessage(userId, botId, msg.from, msg.body, reply);
    console.log(`[WA] Replied to ${msg.from}: "${reply.substring(0, 60)}"`);
  } catch (err) {
    console.error(`[WA] Error handling message from ${msg.from}:`, err);
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getSessionStatus(
  userId: string
): "connecting" | "connected" | "disconnected" {
  return sessions.get(userId)?.status ?? "disconnected";
}

export async function destroySession(userId: string): Promise<void> {
  const entry = sessions.get(userId);
  if (!entry) return;
  try {
    await entry.client.destroy();
  } catch {
    // already destroyed
  }
  sessions.delete(userId);
  await updateSessionStatus(userId, "disconnected");
  // Give OS a moment then clean lockfile
  setTimeout(() => clearLockfile(userId), 1_500);
  console.log(`[WA] Session destroyed for ${userId}`);
}

export function updateSessionBot(userId: string, botId: string): void {
  const entry = sessions.get(userId);
  if (entry) entry.botId = botId;
}

export async function restoreSessionsFromDb(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    const session = await getSessionByUserId(userId);
    if (session?.bot_id && session.status === "connected") {
      console.log(`[WA] Restoring session for ${userId}`);
      try {
        await startSession(userId, session.bot_id);
      } catch (err) {
        console.error(`[WA] Restore failed for ${userId}:`, err);
      }
    }
  }
}
