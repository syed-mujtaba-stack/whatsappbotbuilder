# dashboard

Next.js frontend for the WhatsApp AI Agent platform. Provides a clean dark-themed UI to manage bots, connect WhatsApp, and monitor message logs.

---

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand (auth store)
- **HTTP:** Axios (with JWT interceptor)
- **Realtime:** Native WebSocket (QR streaming)
- **UI:** Custom components (Button, Input, Textarea, Card, Badge)
- **Notifications:** react-hot-toast
- **Icons:** lucide-react
- **Font:** Geist (next/font)

---

## Pages

| Route | Description |
|---|---|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Home — stats, bot list, WhatsApp status |
| `/dashboard/bots` | All bots with edit/delete actions |
| `/dashboard/bots/new` | Create a new bot |
| `/dashboard/bots/:id/edit` | Edit an existing bot |
| `/dashboard/connect` | Connect WhatsApp via QR code |
| `/dashboard/logs` | Message conversation history |

---

## Setup

### Prerequisites

- Node.js 18+
- Backend (`whatsapp-server`) running

### Install

```bash
npm install --legacy-peer-deps
```

### Environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
# Local development
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Production (after deploying backend to Render)
# NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
# NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000`

---

## Project Structure

```
app/
├── (auth)/
│   ├── login/page.tsx          # Login page
│   └── register/page.tsx       # Register page
├── (dashboard)/
│   ├── layout.tsx              # Sidebar + AuthGuard wrapper
│   └── dashboard/
│       ├── page.tsx            # Home dashboard
│       ├── bots/
│       │   ├── page.tsx        # Bot list
│       │   ├── new/page.tsx    # Create bot
│       │   └── [id]/edit/      # Edit bot
│       ├── connect/page.tsx    # WhatsApp QR connect
│       └── logs/page.tsx       # Message logs
├── globals.css                 # Tailwind + dark theme CSS vars
└── layout.tsx                  # Root layout with Toaster

components/
├── layout/
│   ├── Sidebar.tsx             # Navigation sidebar
│   └── AuthGuard.tsx           # Redirects unauthenticated users
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Textarea.tsx
    ├── Card.tsx
    └── Badge.tsx

lib/
└── api.ts                      # Axios client + typed API helpers

store/
└── authStore.ts                # Zustand auth store (JWT + user)
```

---

## Deployment on Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your repo — set **Root Directory** to `dashboard`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Render backend URL (e.g. `https://your-app.onrender.com`)
   - `NEXT_PUBLIC_WS_URL` → same but `wss://` (e.g. `wss://your-app.onrender.com`)
5. Deploy

> Make sure `FRONTEND_URL` in your backend `.env` matches the Vercel deployment URL so CORS works correctly.
