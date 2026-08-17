# WhatsApp AI Agent Platform

A full-stack platform to build and deploy AI-powered WhatsApp bots — no third-party API needed. Connect your own WhatsApp number via QR code and let an AI bot handle conversations based on your custom system prompt.

---

## Project Structure

```
whatsapp-me-agent/
├── dashboard/          # Next.js frontend — deploy on Vercel
└── whatsapp-server/    # Express + whatsapp-web.js backend — deploy on Render
```

---

## How It Works

1. **Register / Login** on the dashboard
2. **Create a Bot** — write a system prompt (e.g. "You are a customer support agent for XYZ store") and pick a free AI model
3. Optionally add **allowed numbers** — bot only replies to those contacts
4. **Connect WhatsApp** — scan the QR code with your phone
5. Your bot is live — incoming messages get AI replies automatically

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Backend | Express.js, TypeScript, whatsapp-web.js |
| Database | Neon (serverless Postgres) |
| AI | OpenRouter (free models) |
| Auth | JWT + bcrypt |
| Realtime | WebSocket (ws) |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Quick Start

### 1. Backend

```bash
cd whatsapp-server
npm install
npx puppeteer browsers install chrome
cp .env.example .env        # fill in your values
npm run dev
```

### 2. Frontend

```bash
cd dashboard
npm install --legacy-peer-deps
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open `http://localhost:3000`

---

## Environment Variables

### Backend (`whatsapp-server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Random string, min 32 chars |
| `OPENROUTER_API_KEY` | Get free at openrouter.ai |
| `PORT` | Server port (default `4000`) |
| `FRONTEND_URL` | Frontend URL for CORS |

### Frontend (`dashboard/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL |

---

## Deployment

### Backend → Render

- **Build command:** `npm run build`
- **Start command:** `npm start`
- Set all env vars from `whatsapp-server/.env.example`

> Render's free tier sleeps after inactivity — use a paid plan or a keep-alive ping for production.

### Frontend → Vercel

- Connect the `dashboard/` folder (or root with `dashboard` as root dir)
- Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to your Render backend URL
- Deploy

---

## Free AI Models

Models are sourced from [OpenRouter](https://openrouter.ai/collections/free-models). Current defaults:

- `google/gemma-4-27b-it:free`
- `google/gemma-4-31b-it:free`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `nvidia/nemotron-nano-9b-v2:free`
- `z-ai/glm-5.2:free`
- `openai/gpt-oss-20b:free`

If a model becomes unavailable, the bot automatically falls back to the next one.

---

## Anti-Ban Measures

whatsapp-web.js is used carefully to reduce ban risk:

- Real Chrome user-agent (not HeadlessChrome)
- `--disable-blink-features=AutomationControlled` flag hides automation detection
- 2–5 second random delay before each reply (human typing pace)
- 8 second per-sender cooldown (prevents spam detection)
- `sendPresenceAvailable()` + `sendSeen()` before replying
- Session persisted with `LocalAuth` so QR is only needed once

> **Note:** Use a secondary number for testing. WhatsApp can ban accounts that exhibit bot-like patterns.
