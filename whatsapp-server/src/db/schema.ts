import { sql } from "./client";

export async function runMigrations(): Promise<void> {
  console.log("Running database migrations...");

  // Users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Bots table
  await sql`
    CREATE TABLE IF NOT EXISTS bots (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      system_prompt   TEXT NOT NULL,
      model           TEXT NOT NULL DEFAULT 'meta-llama/llama-3.1-8b-instruct:free',
      allowed_numbers TEXT[] NOT NULL DEFAULT '{}',
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // WhatsApp sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bot_id      UUID REFERENCES bots(id) ON DELETE SET NULL,
      status      TEXT NOT NULL DEFAULT 'disconnected',
      phone       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Message logs table
  await sql`
    CREATE TABLE IF NOT EXISTS message_logs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bot_id       UUID REFERENCES bots(id) ON DELETE SET NULL,
      from_number  TEXT NOT NULL,
      message      TEXT NOT NULL,
      reply        TEXT,
      replied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Database migrations completed successfully.");
}
