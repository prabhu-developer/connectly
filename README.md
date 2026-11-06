# Connectly

> Production-Quality Full-Stack Private Chat Application built with Turborepo, Next.js 16, Express, Socket.IO, and MongoDB.

---

## 🌐 Live Production & Demo Deployments

| Component | Live Production URL | Description |
| :--- | :--- | :--- |
| **Web Frontend** | [https://connectlyi.netlify.app/](https://connectlyi.netlify.app/) | Next.js 16 Chat UI with theme switcher, real-time presence, media preview, search & settings |
| **Backend API** | [https://connectlyi-api.netlify.app/](https://connectlyi-api.netlify.app/) | Express Serverless API deployed on Netlify Functions |
| **Health Check** | [https://connectlyi-api.netlify.app/health](https://connectlyi-api.netlify.app/health) | Returns HTTP 200 `{ "success": true, "message": "Connectly API is running" }` |

---

## 👥 Demo Test Accounts

Pre-seeded demo credentials for instant evaluation on [https://connectlyi.netlify.app/](https://connectlyi.netlify.app/) (also available via one-click quick-fill buttons on the login page):

| User | Email / Username | Password | Role / Bio |
| :--- | :--- | :--- | :--- |
| **Alice Johnson** | `alice@connectly.dev` (or `alice`) | `Password123!` | Product designer & coffee enthusiast |
| **Bob Smith** | `bob@connectly.dev` (or `bob`) | `Password123!` | Full-stack engineer building real-time applications |
| **Charlie Davis** | `charlie@connectly.dev` (or `charlie`) | `Password123!` | DevOps & open source advocate |

> [!TIP]
> To test real-time 1-to-1 conversation, open **Alice** in a regular browser tab and **Bob** in an Incognito / private window. Both users already have an active conversation thread pre-seeded.

---

## 📡 API Reference & Endpoints

All endpoints are hosted at `https://connectlyi-api.netlify.app/`:

### System & Health Checks
- `GET /health` — Root health check endpoint (`{ "success": true, "message": "Connectly API is running" }`)
- `GET /api/health` — API-scoped health check endpoint

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`email`, `username`, `password`, `displayName`)
- `POST /api/auth/login` — Sign in with identifier (email/username) and password; issues HTTP-only refresh cookie and JSON access token
- `POST /api/auth/refresh` — Rotate refresh session and issue a fresh access token
- `POST /api/auth/logout` — Revoke active refresh session and clear cookies
- `GET /api/auth/me` — Retrieve current authenticated user profile (`Authorization: Bearer <token>`)

### Conversations & Messages (`/api/conversations`)
- `GET /api/conversations` — List conversations for authenticated user with unread counts and last message
- `POST /api/conversations` — Create or retrieve existing deterministic 1-to-1 conversation (`participantId`)
- `GET /api/conversations/:id` — Get conversation details and participants
- `GET /api/conversations/:id/messages` — Paginated message history (supports `cursor` and `limit`)
- `POST /api/conversations/:id/messages` — Send message with idempotency enforcement (`clientTempId`, `content`, `attachment`)
- `GET /api/conversations/:id/messages/search?q=...` — Search messages within conversation
- `POST /api/conversations/:id/read` — Advance read cursor for authenticated user (`messageId`)

### Users & Profiles (`/api/users`)
- `GET /api/users/search?q=...` — Search directory users by username or display name
- `GET /api/users/profile` — Get profile of authenticated user
- `PATCH /api/users/profile` — Update display name and bio
- `GET /api/users/settings` — Get user preferences (theme, notification sound, enter-to-send)
- `PATCH /api/users/settings` — Update user preferences
- `GET /api/users/:id` — Get public participant contact card

### Presence (`/api/presence`)
- `GET /api/presence` — Query multi-session online status for multiple user IDs (`?userIds=id1,id2`)
- `GET /api/presence/:userId` — Query real-time status and `lastSeenAt` for a specific user

### Media & Attachments (`/api/media`)
- `POST /api/media/upload` — Upload multipart file attachment (images up to 10MB, documents up to 25MB)
- `GET /api/media/:filename` — Securely stream uploaded file attachment

---

## 1. Monorepo Structure

```text
connectly/
├── apps/
│   ├── web/                     # Next.js 16 (App Router) frontend (port 3000)
│   ├── server/                  # Express + Socket.IO backend & Serverless adapter (port 5000)
│   └── docs/                    # Internal documentation app (port 3001)
├── packages/
│   ├── contracts/               # Shared type contracts, API envelopes & socket events (@repo/contracts)
│   ├── ui/                      # Reusable UI component library (@repo/ui)
│   ├── eslint-config/           # Shared ESLint 10 flat configurations (@repo/eslint-config)
│   └── typescript-config/       # Shared TypeScript 7 compiler configs (@repo/typescript-config)
├── netlify/
│   └── functions/               # Root Netlify serverless functions (`api.ts`, `health.ts`)
├── docs/                        # Architecture & design specifications
├── netlify.toml                 # Netlify deployment pipeline and URL redirect rules
├── package.json                 # Monorepo root configuration (pnpm workspace)
├── pnpm-workspace.yaml          # Monorepo package directories
└── turbo.json                   # Turborepo task pipeline configuration
```

---

## 2. Prerequisites

- **Node.js**: `>=24` (verified with `v24.20.0`)
- **pnpm**: `11.25.0` (managed via Corepack or direct pnpm)
- **MongoDB**: `>=6.0` (or MongoDB Atlas for cloud deployment)

---

## 3. Quick Start & Local Development

### Installation

```bash
pnpm install
```

### Environment Configuration

#### 1. Backend (`apps/server/.env`):

```bash
cp apps/server/.env.example apps/server/.env
```

Default variables:
```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,https://connectlyi.netlify.app
MONGODB_URI=mongodb://localhost:27017/connectly
JWT_ACCESS_SECRET=dev_access_secret_change_in_production_min_32_chars
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_min_32_chars
COOKIE_SECRET=dev_cookie_secret_change_in_production_min_32_chars
```

#### 2. Frontend (`apps/web/.env.local`):

```bash
cp apps/web/.env.example apps/web/.env.local
```

Default variables:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Database Seeding

Populate development database with demo accounts and conversation history:

```bash
pnpm --filter server seed
```

### Running Applications

```bash
# Run both frontend and backend concurrently via Turborepo
pnpm dev

# Run only the Next.js frontend (http://localhost:3000)
pnpm dev:web

# Run only the Express backend (http://localhost:5000)
pnpm dev:server
```

---

## 4. Verification & Quality Commands

```bash
# Type check all workspaces
pnpm check-types

# Lint all workspaces (ESLint 10 flat config)
pnpm lint

# Run automated tests (113 tests across workspaces)
pnpm test

# Build production assets for all workspaces
pnpm build
```

---

## 5. Netlify Production Deployment Configuration

### Web Frontend Deployment (`https://connectlyi.netlify.app/`)
- **Base directory**: `apps/web` (or root with `--filter web`)
- **Build command**: `pnpm --filter web build`
- **Publish directory**: `apps/web/.next`
- **Environment variables**:
  - `NEXT_PUBLIC_API_URL`: `https://connectlyi-api.netlify.app/api`
  - `NEXT_PUBLIC_SOCKET_URL`: `https://connectlyi-api.netlify.app`

### Backend API Deployment (`https://connectlyi-api.netlify.app/`)
- **Base directory**: `/` (or `apps/server`)
- **Build command**: `pnpm --filter server build`
- **Publish directory**: `apps/server/dist`
- **Functions directory**: `netlify/functions`
- **Environment variables**:
  - `NODE_ENV`: `production`
  - `CORS_ORIGIN`: `https://connectlyi.netlify.app`
  - `MONGODB_URI`: `<your-mongodb-atlas-uri>`
  - `JWT_ACCESS_SECRET`: `<secure-random-32+-char-string>`
  - `JWT_REFRESH_SECRET`: `<secure-random-32+-char-string>`
  - `COOKIE_SECRET`: `<secure-random-32+-char-string>`

---

## 6. Architecture & Implementation Guide

For in-depth architectural specifications, multi-session presence tracking, read cursor data models, and socket idempotency workflows, refer to [`docs/architecture.md`](./docs/architecture.md).
