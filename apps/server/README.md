# Connectly Backend API & Serverless Functions

> Express & Socket.IO backend service for Connectly, supporting both persistent local servers and serverless Netlify Functions.

---

## 🌐 Live Production Deployment

- **Production API URL**: [https://connectlyi-api.netlify.app/](https://connectlyi-api.netlify.app/)
- **Health Check Endpoint**: [https://connectlyi-api.netlify.app/health](https://connectlyi-api.netlify.app/health)
- **Allowed Frontend Origin**: [https://connectlyi.netlify.app/](https://connectlyi.netlify.app/)

Expected Health Response:
```json
{
  "success": true,
  "message": "Connectly API is running"
}
```

---

## 👥 Demo Test Accounts

The following demo accounts are available when seeding the database:

- **Alice Johnson**: `alice@connectly.dev` (or `alice`) / `Password123!`
- **Bob Smith**: `bob@connectly.dev` (or `bob`) / `Password123!`
- **Charlie Davis**: `charlie@connectly.dev` (or `charlie`) / `Password123!`

Seed command:
```bash
pnpm seed
```

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Variables:

| Variable | Local Default | Netlify Production |
| :--- | :--- | :--- |
| `PORT` | `5000` | Ignored on Netlify Functions |
| `NODE_ENV` | `development` | `production` |
| `CORS_ORIGIN` | `http://localhost:3000,https://connectlyi.netlify.app` | `https://connectlyi.netlify.app` |
| `MONGODB_URI` | `mongodb://localhost:27017/connectly` | MongoDB Atlas URI |
| `JWT_ACCESS_SECRET` | 32+ char secret | Production random secret |
| `JWT_REFRESH_SECRET` | 32+ char secret | Production random secret |
| `COOKIE_SECRET` | 32+ char secret | Production random secret |

---

## 🚀 Development & Verification

```bash
# Run standalone HTTP + Socket.IO server locally
pnpm dev

# Type check
pnpm check-types

# Lint
pnpm lint

# Run backend test suite (Vitest + Supertest)
pnpm test

# Build compiled TypeScript output to dist/
pnpm build
```
