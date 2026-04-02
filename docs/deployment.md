# Deployment Guide

How Portfello is deployed on the lr15a.pl self-hosted platform.

---

## 1. Architecture

### Tiered Hosting

| Tier | For | Stack | When to use |
|------|-----|-------|-------------|
| **Tier 1** | Production apps (Filbert, Reminto) | Supabase Cloud | App uses pgvector, RLS, Supabase SDK deeply |
| **Tier 2** | Everything else | Self-hosted on Hetzner | Standard Next.js + PostgreSQL + Auth.js |

Portfello runs on **Tier 2**.

### Infrastructure

```
App Server (Hetzner CX22)              DB Server (Hetzner CX22)
┌──────────────────────────┐           ┌──────────────────────────┐
│  Coolify (PaaS)          │           │  PostgreSQL 16           │
│  ├─ portfello            │◄─────────►│    ├─ portfello_db       │
│  ├─ app-2                │  private  │    ├─ app_2_db           │
│  └─ ...                  │  network  │    └─ ...                │
│                          │           │                          │
│  SSL: Let's Encrypt      │           │  No public ports         │
│  DNS: *.lr15a.pl wildcard│           │                          │
└──────────────────────────┘           └──────────────────────────┘
                                         │
                                         ▼ cron: pg_dumpall
                                       Hetzner Storage Box
```

**Why two servers:** independent scaling (apps need CPU, DB needs RAM/IO), failure isolation (runaway container can't OOM-kill PostgreSQL), security (DB has no public ports).

### Cost

| Component | Monthly |
|-----------|---------|
| App Server (CX22) | ~€4 |
| DB Server (CX22) | ~€4 |
| Storage Box (backups) | ~€3 |
| **Total** | **~€11** |

---

## 2. Database

### Strategy

A single PostgreSQL 16 process on the DB server. Each app gets its own database and user.

- Full isolation: own tables, migrations, connection string
- Dropping an app = `DROP DATABASE app_name;`
- Memory shared efficiently via `shared_buffers`

### Connection

- Private network only (no public access)
- Port `5432`, SSL required (`?sslmode=require`)

### Provisioning

Run the provisioning script on the DB server to create the database and scoped user.

### Prisma Setup

This app uses **Prisma 7.x** with the `@prisma/adapter-pg` driver adapter. The database URL is not in the schema — it's read from `DATABASE_URL` at runtime via the adapter in `lib/prisma.ts`.

Schema (`prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

Migrations run automatically at container startup (see Dockerfile section).

### Backups

- Nightly `pg_dumpall` cron on the DB server
- Pushed to Hetzner Storage Box
- Retain 7 daily + 4 weekly backups

---

## 3. Authentication

Auth.js (NextAuth v5) with:

- **Credentials provider** — email + password (bcrypt hashed)
- **JWT session strategy** — no database sessions
- **Prisma adapter** — user/account tables in the app's own database
- Middleware protects `/dashboard`, `/analytics`, and `/api/expenses/*`

Config: `auth.ts`. Middleware: `middleware.ts`.

---

## 4. Dockerfile

Coolify builds and runs the `Dockerfile` from the repo root. The actual Dockerfile:

```dockerfile
FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Prisma CLI for running migrations at container startup
RUN npm install -g prisma

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma runtime: generated client and schema for migrations
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
```

Key points:

- Multi-stage build (deps → build → production) keeps image small
- Runs as non-root `nextjs` user
- Prisma CLI installed globally for `prisma migrate deploy` at startup
- Generated Prisma client + schema copied to production image
- `HOSTNAME=0.0.0.0` so the container is reachable

### next.config.js

```js
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'bcryptjs'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
}

export default nextConfig
```

- `output: 'standalone'` — required for the Docker build
- `serverExternalPackages` — ensures Prisma adapter, pg, and bcryptjs are traced into the standalone output (not bundled away by Next.js)

### Build Requirements

- `npm ci && npm run build` must succeed with zero errors
- `package-lock.json` must be committed
- `"engines": { "node": ">=22.12.0" }` in `package.json` (required by Prisma 7.x)
- TypeScript must compile cleanly
- All runtime deps in `dependencies` (not `devDependencies`)

### Nixpacks (Fallback)

If Coolify's Build Pack is set to "Nixpacks" instead of "Dockerfile", it auto-detects the framework. Less control — prefer the Dockerfile. Make sure Build Pack is set to **Dockerfile** in Coolify.

---

## 5. Environment Variables

Set in the **Coolify dashboard** — never committed to the repo.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (provided after DB provisioning) |
| `AUTH_SECRET` | Auth.js signing secret (32+ random bytes, unique per app) |
| `AUTH_URL` | App's public URL: `https://portfello.lr15a.pl` |

Rules:

- Never commit secrets to the repo
- Never log environment variables in application code
- `.env.example` has empty placeholders for documentation only
- Build-time vars (e.g., `NEXT_PUBLIC_*`) must be toggled as "Build Variable" in Coolify

---

## 6. Deployment Workflow

### Pre-Deploy Checklist

- [ ] `npm ci && npm run build` succeeds locally
- [ ] `package-lock.json` is committed
- [ ] No secrets in the codebase
- [ ] Dockerfile uses a non-root user
- [ ] `.env.example` exists with empty placeholders
- [ ] Security headers configured
- [ ] `npm audit` shows no critical vulnerabilities

### Deploying (Platform Admin)

1. **Create database** — run the provisioning script on the DB server
2. **Add app in Coolify** — Projects → Add Resource → select GitHub repo → set Build Pack to "Dockerfile" → set domain to `portfello.lr15a.pl`
3. **Set environment variables** — `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
4. **Deploy** — push to `main` or trigger manually in Coolify
5. **Verify** — `curl https://portfello.lr15a.pl/api/health`

DNS: `*.lr15a.pl` wildcard — no per-app setup needed. SSL: auto-provisioned by Coolify via Let's Encrypt.

### Continuous Deployment

Every push to `main` auto-deploys via GitHub webhook. No CI/CD pipeline, container registry, or SSH needed — Coolify handles the full build-deploy cycle on the server.

---

## 7. Scaling

- **App server (CX22, 4GB):** May need CX32 (8GB, ~€8/mo) as more apps are added.
- **DB server (CX22, 4GB):** Sufficient for 15-20 low-traffic databases.
- **Graduating an app:** Move to Supabase Cloud (Tier 1) or dedicated resources.
