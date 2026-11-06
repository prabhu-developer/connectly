# Connectly

A full-stack private chat application built with Turborepo, Next.js 16, Express, Socket.IO, and MongoDB.

## Live Demo

| Component | URL |
|---|---|
| Application | https://connectlye.netlify.app |
| API | https://connectlye.netlify.app/api |
| Health Check | https://connectlye.netlify.app/health |

The frontend and backend are deployed through a single Netlify site using the same domain. Next.js handles frontend routes, while Express API requests are routed through Netlify Functions.

## Demo Accounts

| User | Email | Password |
|---|---|---|
| Alice Johnson | alice@connectly.dev | Password123! |
| Bob Smith | bob@connectly.dev | Password123! |
| Charlie Davis | charlie@connectly.dev | Password123! |

To test real-time messaging, sign in as Alice in one browser and Bob in another.

## API Endpoints

All API requests use the following base URL:

`https://connectlye.netlify.app/api`

### Authentication
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Conversations
- `GET /conversations`
- `POST /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
- `GET /conversations/:id/messages/search`
- `POST /conversations/:id/read`

### Users
- `GET /users/search`
- `GET /users/profile`
- `PATCH /users/profile`
- `GET /users/settings`
- `PATCH /users/settings`
- `GET /users/:id`

### Presence
- `GET /presence`
- `GET /presence/:userId`

### Media
- `POST /media/upload`
- `GET /media/:filename`

### Health
- `GET /health`
- `GET /api/health`

## Project Structure

```text
connectly/
├── apps/
│   ├── web/             # Next.js frontend
│   ├── server/          # Express API and Socket.IO
│   └── docs/            # Documentation application
├── packages/
│   ├── contracts/       # Shared types and API contracts
│   ├── ui/              # Shared UI components
│   ├── eslint-config/
│   └── typescript-config/
├── netlify/
│   └── functions/       # Netlify serverless functions
├── docs/
├── netlify.toml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Requirements

- Node.js >= 24
- pnpm 11.25.0
- MongoDB 6.0 or later

## Getting Started

Install dependencies:

```bash
pnpm install
```

### Environment Variables

Create the backend environment file:

```bash
cp apps/server/.env.example apps/server/.env
```

Create the frontend environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Backend configuration:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/connectly
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
COOKIE_SECRET=your_cookie_secret
```

Frontend configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Database Seeding

```bash
pnpm --filter server seed
```

### Development

Run all applications:

```bash
pnpm dev
```

Run the frontend:

```bash
pnpm dev:web
```

Run the backend:

```bash
pnpm dev:server
```

## Scripts

```bash
pnpm build
pnpm lint
pnpm check-types
pnpm test
```

## Deployment

Connectly is deployed using a single Netlify site connected to the Turborepo repository.

| Setting | Value |
|---|---|
| Base directory | `/` |
| Package directory | `apps/web` |
| Build command | `pnpm build` |
| Publish directory | Leave empty |
| Functions directory | `netlify/functions` |
| Runtime | Next.js |

The root build command should build the required workspace dependencies and applications.

### Environment Variables

Configure these variables in Netlify:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://connectlye.netlify.app/api
NEXT_PUBLIC_SOCKET_URL=https://connectlye.netlify.app
CORS_ORIGIN=https://connectlye.netlify.app
MONGODB_URI=your_mongodb_atlas_uri
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
COOKIE_SECRET=your_cookie_secret
```

Keep database credentials and authentication secrets server-side.

### Routing

| Path | Destination |
|---|---|
| `/` | Next.js |
| `/dashboard` | Next.js |
| `/api/*` | Express API |
| `/health` | Health function |

## Documentation

See [docs/architecture.md](./docs/architecture.md) for application architecture, database models, presence tracking, message delivery, and Socket.IO implementation details.
