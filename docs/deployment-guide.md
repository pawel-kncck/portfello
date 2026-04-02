# Deployment Guide — lr15a.pl Platform

This guide explains how to make your app deployment-ready for the lr15a.pl self-hosted platform (Coolify on Hetzner). Copy this file into your repo as a reference.

## Platform Overview

- **Hosting**: Coolify (self-hosted PaaS) on Hetzner Cloud, Falkenstein
- **Database**: Shared PostgreSQL 16 on a separate server, accessible via private network
- **SSL**: Automatic via Let's Encrypt
- **Deploys**: Push to `main` → auto-deploy via GitHub webhook
- **Domain**: `<app_name>.lr15a.pl`

## Making Your App Deployment-Ready

### Option A: Dockerfile (Recommended)

Provide a `Dockerfile` in your repo root. Coolify will build and run it.

**Next.js example:**

```dockerfile
FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**Key requirements:**

- Run as a **non-root user** (see `USER nextjs` above)
- Expose a single port (Coolify routes traffic to it)
- Use multi-stage builds to keep the image small

**For Next.js standalone output**, add this to `next.config.js`:

```js
module.exports = {
  output: "standalone",
};
```

### Option B: Nixpacks (Zero-config)

If you don't provide a Dockerfile, Coolify uses [Nixpacks](https://nixpacks.com) to auto-detect your framework and build. This works well for standard setups but gives you less control.

Nixpacks will auto-detect:
- **Next.js** — builds with `npm run build`, runs with `npm start`
- **Vite/React SPA** — builds static files, serves with a static server
- **Express/Node** — runs `npm start`

### Build Requirements

Regardless of which option you use, your app must:

1. **Build cleanly** — `npm run build` must succeed with zero errors
2. **Have a lockfile** — `package-lock.json` must be committed (not in `.gitignore`)
3. **Not depend on `.env` files at build time** — environment variables are injected at runtime by Coolify, not during build. If your build needs env vars (e.g., `NEXT_PUBLIC_*`), configure them as build-time variables in Coolify.
4. **Listen on `0.0.0.0`** — not `localhost` or `127.0.0.1`, so the container is reachable

### TypeScript

If your project uses TypeScript, the build **must pass `tsc` with zero errors**. Fix or suppress all type errors before deploying. Common issues:

- Unused imports → remove them or set `"noUnusedLocals": false` in `tsconfig.json`
- Missing type packages → install `@types/*` packages as devDependencies
- Strict mode errors → fix the types or adjust `tsconfig.json` strictness

### Dependencies

All runtime dependencies must be in `dependencies` (not `devDependencies`) in `package.json`. The production image only installs `dependencies`.

Make sure `npm ci && npm run build` succeeds on a clean machine before pushing.

## Environment Variables

Environment variables are set in the Coolify dashboard per app — never committed to the repo.

### Standard variables provided for every app:

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@<db-host>:5432/db?sslmode=require` | PostgreSQL connection string (private network) |
| `AUTH_SECRET` | *(generated per app)* | Auth.js / NextAuth signing secret (32+ bytes, random) |
| `AUTH_URL` | `https://myapp.lr15a.pl` | App's public URL (used for OAuth callbacks) |

### Rules:

- **Never** commit secrets to the repo (no `.env` files with real values)
- **Never** log environment variables in your application code
- Keep `.env.example` with empty placeholder values for documentation
- Each app gets its own unique `AUTH_SECRET` and `DATABASE_URL`

### Build-time vs runtime variables

- **Runtime variables** (default): Available when the container runs. Use for secrets, database URLs, API keys.
- **Build-time variables**: Available during `npm run build`. Required for Next.js `NEXT_PUBLIC_*` variables. Toggle "Build Variable" in Coolify's env var settings.

## Database

Each app gets its own PostgreSQL database and user with minimal privileges. The database is on a separate server, accessible only via the private network.

### Connection

- Host: `<db-host>` (private network, not publicly accessible)
- Port: `5432`
- SSL: Required (`?sslmode=require` in connection string)
- Your app user can only access its own database

### Prisma

If you use Prisma, your `prisma/schema.prisma` should have:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Run migrations from Coolify by adding a pre-deploy command or including it in your Dockerfile:

```dockerfile
# In your Dockerfile, before CMD:
RUN npx prisma generate
# Migrations run at startup:
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### Drizzle

```ts
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(process.env.DATABASE_URL!);
```

Run migrations in your startup command:

```dockerfile
CMD ["sh", "-c", "npx drizzle-kit migrate && node server.js"]
```

## Security Headers

Add these headers in your app. For Next.js, in `next.config.js`:

```js
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

## Pre-Deploy Checklist

Before pushing to `main` for the first time:

- [ ] `npm ci && npm run build` succeeds locally with no errors
- [ ] `package-lock.json` is committed
- [ ] No secrets in the codebase (check with `git log -p | grep -i secret`)
- [ ] App listens on `0.0.0.0`, not `localhost`
- [ ] Dockerfile uses a non-root user (if using Dockerfile)
- [ ] `.env.example` exists with empty placeholders
- [ ] Security headers configured
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Privacy policy in place (if storing EU user data — GDPR)

## Deployment Steps (for the platform admin)

These steps are done once per app by the platform admin:

1. **Create database**: Run the database provisioning script on the DB server
2. **Add app in Coolify**: Projects → Add Resource → select repo → set domain to `myapp.lr15a.pl`
3. **Set env vars** in Coolify: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, plus any app-specific vars
4. **DNS**: Already covered by `*.lr15a.pl` wildcard — no action needed
5. **Deploy**: Push to `main` or trigger manually in Coolify

After the first deploy, subsequent pushes to `main` auto-deploy.
