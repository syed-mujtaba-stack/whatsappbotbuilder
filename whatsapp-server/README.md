# whatsapp-server

Express.js backend for the WhatsApp AI Agent platform. Handles authentication, bot management, WhatsApp sessions via whatsapp-web.js, and AI replies via OpenRouter.

---

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **WhatsApp:** whatsapp-web.js (Puppeteer-based)
- **Database:** Neon serverless Postgres (`@neondatabase/serverless`)
- **AI:** OpenRouter API (free models, via `openai` SDK)
- **Auth:** JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)
- **Realtime:** WebSocket (`ws`) for QR code streaming
- **Validation:** Zod

---

## Project Structure

```
src/
├── server.ts                  # Entry point — Express + HTTP + WebSocket server
├── db/
│   ├── client.ts              # Neon SQL client
│   ├── schema.ts              # Table migrations (runs on boot)
│   └── queries.ts             # All typed DB query functions
├── middleware/
│   ├── auth.ts                # JWT requireAuth middleware
│   └── validate.ts            # Zod request body validation
├── routes/
│   ├── auth.ts                # POST /api/auth/register, /login, GET /me
│   ├── bots.ts                # CRUD /api/bots + GET /api/bots/meta/models
│   └── whatsapp.ts            # /api/whatsapp/status, /connect, /disconnect, /bot, /logs
└── whatsapp/
    ├── sessionManager.ts      # Multi-user WhatsApp session lifecycle + message handler
    └── aiHandler.ts           # OpenRouter call + fallback chain + thinking strip
```

---

## Setup

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) database
- An [OpenRouter](https://openrouter.ai) API key (free)
- Chrome installed by Puppeteer (see below)

### Install

```bash
npm install
npx puppeteer browsers install chrome
```

### Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require
JWT_SECRET=your_random_secret_min_32_chars
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

Database migrations run automatically on startup.

---

## API Reference

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | Create account |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user |

### Bots

All routes require `Authorization: Bearer <token>` header.

| Method | Path | Description |
|---|---|---|
| GET | `/api/bots` | List all bots |
| POST | `/api/bots` | Create bot |
| GET | `/api/bots/:id` | Get single bot |
| PUT | `/api/bots/:id` | Update bot |
| DELETE | `/api/bots/:id` | Delete bot |
| GET | `/api/bots/meta/models` | List available free AI models |

**Bot body:**
```json
{
  "name": "Support Bot",
  "system_prompt": "You are a helpful support agent...",
  "model": "google/gemma-4-27b-it:free",
  "allowed_numbers": ["923001234567"]
}
```

### WhatsApp

| Method | Path | Description |
|---|---|---|
| GET | `/api/whatsapp/status` | Session status + phone |
| POST | `/api/whatsapp/connect` | `{ bot_id }` — start session, QR via WebSocket |
| POST | `/api/whatsapp/disconnect` | Destroy session |
| PUT | `/api/whatsapp/bot` | `{ bot_id }` — switch active bot |
| GET | `/api/whatsapp/logs` | Recent message logs (`?limit=50`) |

### WebSocket

Connect to `ws://host/ws?token=<jwt>`

Receives JSON events:

```json
{ "type": "qr", "qr": "data:image/png;base64,..." }
{ "type": "status", "status": "connected", "phone": "923001234567" }
{ "type": "status", "status": "disconnected" }
```

### Health

```
GET /health  →  { "status": "ok", "timestamp": "..." }
```

---

## Database Schema

```sql
users               id, email, password, name, created_at
bots                id, user_id, name, system_prompt, model, allowed_numbers[], is_active
whatsapp_sessions   id, user_id, bot_id, status, phone
message_logs        id, user_id, bot_id, from_number, message, reply, replied_at
```

---

## Deployment on Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your repository, set root directory to `whatsapp-server`
3. **Build command:** `npm run build`
4. **Start command:** `npm start`
5. Add all environment variables from `.env.example`

> Puppeteer requires Chrome — Render's Docker environment supports it. If you get a Chrome error on Render, add `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` and ensure `puppeteer browsers install chrome` runs during build.
