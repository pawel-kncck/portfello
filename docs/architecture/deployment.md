# Deployment Guide

> Source of truth: `Dockerfile` and Coolify configuration. If this document conflicts with those, they win.

## Architecture

### Tiered hosting

| Tier | For | Stack | When to use |
|---|---|---|---|
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
|---|---|
| App Server (CX22) | ~EUR4 |
| DB Server (CX22) | ~EUR4 |
| Storage Box (backups) | ~EUR3 |
| **Total** | **~EUR11** |

## Database

A single PostgreSQL 16 process on the DB server. Each app gets its own database and user.

- Private network only (no public access), port 5432, SSL required
- Full isolation: own tables, migrations, connection string
- Nightly `pg_dumpall` to Hetzner Storage Box (retain 7 daily + 4 weekly)

### Drizzle ORM setup

Schema: `lib/schema.ts`. Config: `drizzle.config.ts`. Migrations: `drizzle/`.

Migrations run automatically at container startup via `npx drizzle-kit migrate` in the Dockerfile CMD.

The database URL is read from the `DATABASE_URL` environment variable (injected by Coolify, never committed to repo).

## Authentication

Auth.js (NextAuth v5) with:
- Credentials provider (email + password, bcrypt hashed)
- JWT session strategy (no database sessions)
- Drizzle adapter for user/account tables
- Config: `auth.ts`

## Dockerfile

Multi-stage build: deps -> build -> production.

```dockerfile
FROM node:24-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=deps /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx drizzle-kit migrate && node server.js"]
```

Key points:
- Runs as non-root `nextjs` user
- Full `node_modules` copied to production (needed for Drizzle Kit migrations at startup)
- `npm install` (not `npm ci`) for cross-environment compatibility — see [learnings/deployment-lessons.md](../learnings/deployment-lessons.md#issue-1)
- TypeScript errors ignored in build to avoid OOM on 4GB server

### next.config.js

- `output: 'standalone'` — required for Docker build
- `serverExternalPackages: ['pg', 'bcryptjs']` — ensures these are traced into standalone output
- `typescript: { ignoreBuildErrors: true }` — type checking runs locally, not in Docker
- Security headers configured (HSTS, X-Frame-Options, etc.)

## Environment variables

Set in **Coolify dashboard** — never committed to the repo.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js signing secret (32+ random bytes) |
| `AUTH_URL` | App's public URL: `https://portfello.lr15a.pl` |

Rules:
- Never commit secrets
- `.env.example` has empty placeholders for documentation only
- Build-time vars (`NEXT_PUBLIC_*`) must be toggled as "Build Variable" in Coolify
- Use URL-safe database passwords — see [learnings/deployment-lessons.md](../learnings/deployment-lessons.md#issue-7)

## Deployment workflow

### Continuous deployment

Every push to `main` auto-deploys via GitHub webhook. Coolify handles the full build-deploy cycle.

### Pre-deploy checklist

- [ ] `npm ci && npm run build` succeeds locally
- [ ] `npm test` passes
- [ ] `package-lock.json` is committed
- [ ] No secrets in the codebase
- [ ] `.env.example` is up to date

### Manual deployment

1. Create database on DB server (provisioning script)
2. Add app in Coolify: set Build Pack to "Dockerfile", domain to `portfello.lr15a.pl`
3. Set environment variables
4. Deploy (push to `main` or trigger in Coolify)
5. Verify: `curl https://portfello.lr15a.pl/api/health`

## Scaling

- **App server (CX22, 4GB):** May need CX32 (8GB, ~EUR8/mo) as more apps are added
- **DB server (CX22, 4GB):** Sufficient for 15-20 low-traffic databases
- **Graduating an app:** Move to Supabase Cloud (Tier 1) or dedicated resources
