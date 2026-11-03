# Connectly

> Production-Quality Full-Stack Private Chat Application built with Turborepo, Next.js 16, Express, Socket.IO, and MongoDB.

---

## 1. Monorepo Structure

```text
connectly/
├── apps/
│   ├── web/                     # Next.js 16 (App Router) frontend (port 3000)
│   ├── server/                  # Express + Socket.IO backend (port 5000)
│   └── docs/                    # Internal documentation app (port 3001)
├── packages/
│   ├── contracts/               # Shared type contracts, API envelopes & socket events (@repo/contracts)
│   ├── ui/                      # Reusable UI component library (@repo/ui)
│   ├── eslint-config/           # Shared ESLint 10 flat configurations (@repo/eslint-config)
│   └── typescript-config/       # Shared TypeScript 7 compiler configs (@repo/typescript-config)
├── docs/                        # Architecture & design specifications
├── package.json                 # Monorepo root configuration (pnpm workspace)
├── pnpm-workspace.yaml          # Monorepo package directories
└── turbo.json                   # Turborepo task pipeline configuration
```

---

## 2. Prerequisites

- **Node.js**: `>=24` (verified with `v24.20.0`)
- **pnpm**: `11.25.0` (managed via Corepack or direct pnpm)
- **Docker & Compose**: (optional for containerized deployment, host has Docker `29.9.2`)

---

## 3. Quick Start & Local Development

### Installation

```bash
pnpm install
```

### Environment Setup

Backend configuration (`apps/server/.env`):

```bash
cp apps/server/.env.example apps/server/.env
```

Default variables:
```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
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

# Lint all workspaces (ESLint flat config)
pnpm lint

# Run automated tests
pnpm test

# Build production assets for all workspaces
pnpm build
```

---

## 5. Health Checks

The backend provides standardized health check endpoints returning the contract defined in `@repo/contracts/health`:

- **GET `/health`**: Root-level lightweight health check
- **GET `/api/health`**: API-scoped health check

Sample response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-03T11:15:50.000Z",
  "uptime": 12,
  "version": "0.1.0",
  "environment": "development",
  "services": {
    "database": "disconnected",
    "socket": "stopped"
  }
}
```

---

## 6. Architecture & Implementation Guide

For in-depth architectural specifications, multi-session presence tracking, read cursor data models, and socket idempotency workflows, refer to [`docs/architecture.md`](./docs/architecture.md).
