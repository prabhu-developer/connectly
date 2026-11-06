# Connectly Web Frontend

> Next.js 16 (App Router) client application for Connectly.

---

## 🌐 Live Production Deployment

- **Production App**: [https://connectlyi.netlify.app/](https://connectlyi.netlify.app/)
- **Connected API**: [https://connectlyi-api.netlify.app/](https://connectlyi-api.netlify.app/)
- **API Health Check**: [https://connectlyi-api.netlify.app/health](https://connectlyi-api.netlify.app/health)

---

## 👥 Demo Test Accounts

The web login page features one-click quick-fill buttons for test accounts:

- **Alice Johnson**: `alice@connectly.dev` (or `alice`) / `Password123!`
- **Bob Smith**: `bob@connectly.dev` (or `bob`) / `Password123!`
- **Charlie Davis**: `charlie@connectly.dev` (or `charlie`) / `Password123!`

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Environment Variables:

| Variable | Local Development | Netlify Production |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | `https://connectlyi-api.netlify.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` | `https://connectlyi-api.netlify.app` |

---

## 🚀 Development & Verification

```bash
# Run Next.js development server
pnpm dev

# Check TypeScript types
pnpm check-types

# Run ESLint
pnpm lint

# Run UI test suite (Vitest + Testing Library)
pnpm test

# Build production Next.js bundle
pnpm build
```
