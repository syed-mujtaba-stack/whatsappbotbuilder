import { sql } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  model: string;
  allowed_numbers: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WhatsAppSession {
  id: string;
  user_id: string;
  bot_id: string | null;
  status: "disconnected" | "connecting" | "connected";
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MessageLog {
  id: string;
  user_id: string;
  bot_id: string | null;
  from_number: string;
  message: string;
  reply: string | null;
  replied_at: Date;
}

// ─── User Queries ─────────────────────────────────────────────────────────────

export async function createUser(
  email: string,
  hashedPassword: string,
  name: string
): Promise<User> {
  const rows = await sql`
    INSERT INTO users (email, password, name)
    VALUES (${email}, ${hashedPassword}, ${name})
    RETURNING *
  `;
  return rows[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

// ─── Bot Queries ──────────────────────────────────────────────────────────────

export async function createBot(
  userId: string,
  name: string,
  systemPrompt: string,
  model: string,
  allowedNumbers: string[]
): Promise<Bot> {
  const rows = await sql`
    INSERT INTO bots (user_id, name, system_prompt, model, allowed_numbers)
    VALUES (${userId}, ${name}, ${systemPrompt}, ${model}, ${allowedNumbers})
    RETURNING *
  `;
  return rows[0] as Bot;
}

export async function getBotsByUserId(userId: string): Promise<Bot[]> {
  const rows = await sql`
    SELECT * FROM bots WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return rows as Bot[];
}

export async function getBotById(
  botId: string,
  userId: string
): Promise<Bot | null> {
  const rows = await sql`
    SELECT * FROM bots WHERE id = ${botId} AND user_id = ${userId} LIMIT 1
  `;
  return (rows[0] as Bot) ?? null;
}

export async function updateBot(
  botId: string,
  userId: string,
  name: string,
  systemPrompt: string,
  model: string,
  allowedNumbers: string[]
): Promise<Bot | null> {
  const rows = await sql`
    UPDATE bots
    SET name = ${name},
        system_prompt = ${systemPrompt},
        model = ${model},
        allowed_numbers = ${allowedNumbers},
        updated_at = NOW()
    WHERE id = ${botId} AND user_id = ${userId}
    RETURNING *
  `;
  return (rows[0] as Bot) ?? null;
}

export async function deleteBot(
  botId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM bots WHERE id = ${botId} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}

// ─── WhatsApp Session Queries ─────────────────────────────────────────────────

export async function upsertSession(
  userId: string,
  status: WhatsAppSession["status"],
  phone?: string | null,
  botId?: string | null
): Promise<WhatsAppSession> {
  const rows = await sql`
    INSERT INTO whatsapp_sessions (user_id, status, phone, bot_id)
    VALUES (${userId}, ${status}, ${phone ?? null}, ${botId ?? null})
    ON CONFLICT (user_id) DO UPDATE
      SET status     = EXCLUDED.status,
          phone      = COALESCE(EXCLUDED.phone, whatsapp_sessions.phone),
          bot_id     = COALESCE(EXCLUDED.bot_id, whatsapp_sessions.bot_id),
          updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as WhatsAppSession;
}

export async function getSessionByUserId(
  userId: string
): Promise<WhatsAppSession | null> {
  const rows = await sql`
    SELECT * FROM whatsapp_sessions WHERE user_id = ${userId} LIMIT 1
  `;
  return (rows[0] as WhatsAppSession) ?? null;
}

export async function updateSessionStatus(
  userId: string,
  status: WhatsAppSession["status"],
  phone?: string | null
): Promise<void> {
  await sql`
    UPDATE whatsapp_sessions
    SET status = ${status},
        phone  = COALESCE(${phone ?? null}, phone),
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

export async function updateSessionBot(
  userId: string,
  botId: string
): Promise<void> {
  await sql`
    UPDATE whatsapp_sessions
    SET bot_id = ${botId}, updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

// ─── Message Log Queries ──────────────────────────────────────────────────────

export async function logMessage(
  userId: string,
  botId: string | null,
  fromNumber: string,
  message: string,
  reply: string | null
): Promise<void> {
  await sql`
    INSERT INTO message_logs (user_id, bot_id, from_number, message, reply)
    VALUES (${userId}, ${botId ?? null}, ${fromNumber}, ${message}, ${reply ?? null})
  `;
}

export async function getMessageLogs(
  userId: string,
  limit = 50
): Promise<MessageLog[]> {
  const rows = await sql`
    SELECT * FROM message_logs
    WHERE user_id = ${userId}
    ORDER BY replied_at DESC
    LIMIT ${limit}
  `;
  return rows as MessageLog[];
}
