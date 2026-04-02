# Migration Plan: Portfello → Self-Hosted (Tier 2 Hetzner)

## Overview

Migrate Portfello from a Vite SPA + Supabase stack to a Next.js + PostgreSQL + Auth.js stack, containerized with Docker, and auto-deployed to Hetzner via Coolify.

**Current stack:** Vite SPA, Supabase Auth, Supabase Edge Functions (Hono/Deno), Supabase KV store
**Target stack:** Next.js, Auth.js, PostgreSQL, Prisma ORM, Docker, Coolify (self-hosted PaaS on Hetzner)
**Domain:** `portfello.lr15a.pl`

---

## Step 1: Scaffold Next.js Project

**Goal:** Replace Vite with Next.js while preserving all existing UI.

**Status: COMPLETED** (commit `875613e`)

**Tasks:**
- [x] Initialize Next.js project with App Router and TypeScript
- [x] Configure Tailwind CSS (carry over `globals.css` design tokens)
- [x] Move shadcn/ui components into the Next.js `components/ui/` directory
- [x] Migrate page components (Dashboard, Analytics, Login, Signup) into Next.js `app/` routes
- [x] Migrate Sidebar and Layout into Next.js layout structure
- [x] Carry over Recharts, Lucide, React Hook Form, Zod dependencies
- [x] Remove Vite config, `src/main.tsx`, `src/vite-env.d.ts`, and `index.html`
- [x] Verify the app builds and renders correctly with `next build`

**Files created:**
- `next.config.js` (with `output: 'standalone'` for Docker)
- `app/layout.tsx`, `app/page.tsx`
- `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
- `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/analytics/page.tsx`
- `components/AppSidebar.tsx` (Next.js version using Link + usePathname)
- `components/DashboardView.tsx` (self-contained, stubbed data fetching)
- `components/AnalyticsView.tsx` (self-contained, stubbed data fetching)

**Files removed:**
- `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `tsconfig.node.json`
- `App.tsx`, `components/Auth.tsx`, `components/Layout.tsx`
- `components/Dashboard.tsx`, `components/DashboardPage.tsx`
- `components/Analytics.tsx`, `components/AnalyticsPage.tsx`
- `utils/supabase/info.tsx`
- Unused shadcn/ui components: context-menu, hover-card, menubar, navigation-menu, breadcrumb, aspect-ratio, pagination, sonner

**Notes:**
- Auth pages use route group `(auth)` with centered layout (no sidebar)
- App pages use route group `(app)` with sidebar layout
- Login/signup handlers are stubs — will be wired to Auth.js in Step 3
- Data fetching is stubbed — will be wired to /api/expenses in Step 4

---

## Step 2: Set Up Prisma + PostgreSQL Schema

**Goal:** Replace Supabase KV store with a proper relational schema.

**Status: COMPLETED** (commit pending)

**Tasks:**
- [x] Install Prisma (`prisma` + `@prisma/client` + `@prisma/adapter-pg`)
- [x] Initialize Prisma with `npx prisma init` (creates `prisma/schema.prisma` + `prisma.config.ts`)
- [x] Define schema in `prisma/schema.prisma`:
  - `User` model (id, email, name, passwordHash, createdAt)
  - Auth.js models (Account, Session, VerificationToken — to be added in Step 3)
  - `Expense` model (id, userId FK, amount, category, description, date, createdAt, updatedAt)
- [x] Configure Prisma client singleton (`lib/prisma.ts`) with PrismaPg adapter
- [x] Generate and apply migration (`npx prisma migrate dev --name init`)
- [x] Update `.env.example` with `DATABASE_URL` placeholder (replaced old Supabase vars)
- [x] Test migration against local PostgreSQL — tables, indexes, and FK verified
- [x] Add `postinstall` script for `prisma generate`
- [x] Build passes cleanly with `next build`

**Files created:**
- `prisma/schema.prisma` — User + Expense models
- `prisma.config.ts` — Prisma config with dotenv
- `prisma/migrations/20260401180057_init/migration.sql` — initial migration
- `lib/prisma.ts` — singleton PrismaClient with PrismaPg adapter
- `generated/prisma/` — generated client (gitignored)

**Notes:**
- Prisma 7.x requires a driver adapter (`@prisma/adapter-pg`) — no built-in query engine
- `generated/prisma/` is gitignored; `postinstall` regenerates it on `npm install`
- Old Supabase env vars removed from `.env.example`

---

## Step 3: Wire Up Auth.js

**Goal:** Replace Supabase Auth with Auth.js (NextAuth v5).

**Status: COMPLETED** (commit pending)

**Tasks:**
- [x] Install `next-auth@beta`, `@auth/prisma-adapter`, `bcryptjs`
- [x] Configure Auth.js in `auth.ts` with Prisma adapter and JWT session strategy
- [x] Set up `Credentials` provider (email + password with bcrypt)
- [x] Add Auth.js models (Account, Session, VerificationToken) to Prisma schema + migration
- [x] Create middleware (`middleware.ts`) to protect `/dashboard` and `/analytics` routes
- [x] Create signup server action (`app/(auth)/signup/action.ts`) with bcrypt hashing
- [x] Wire login page to `signIn('credentials')` from `next-auth/react`
- [x] Wire signup page to call signup action then auto-login via signIn
- [x] Wire AppSidebar to `useSession()` for user info and `signOut()` for logout
- [x] Add `SessionProvider` wrapper (`components/Providers.tsx`) to root layout
- [x] Update root page (`/`) to check session and redirect accordingly
- [x] Update `.env.example` with `AUTH_SECRET` and `AUTH_URL` placeholders
- [x] Build passes cleanly with `next build`

**Files created:**
- `auth.ts` — Auth.js config with Credentials provider + Prisma adapter
- `middleware.ts` — protects /dashboard and /analytics
- `app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `app/(auth)/signup/action.ts` — server action for user registration
- `components/Providers.tsx` — SessionProvider wrapper
- `prisma/migrations/20260401181334_add_auth_models/` — Account, Session, VerificationToken tables

**Notes:**
- JWT session strategy used (not database sessions) for simpler Credentials flow
- Supabase Auth is fully replaced — no Supabase SDK usage remains in auth flow
- `passwordHash` field made optional on User to support potential future OAuth-only users

---

## Step 4: Rewrite API Endpoints as Next.js Route Handlers

**Status: COMPLETED** (commit pending)

**Goal:** Replace Supabase Edge Functions with Next.js API routes using Prisma.

**Tasks:**
- [x] Create `app/api/expenses/route.ts` (GET list, POST create)
- [x] Create `app/api/expenses/[id]/route.ts` (PUT update, DELETE)
- [x] Use Prisma queries with proper Decimal→Number serialization
- [x] Auth via `auth()` session helper with user ownership checks
- [x] Wire DashboardView to fetch/add/edit/delete via `/api/expenses`
- [x] Wire AnalyticsView to fetch from `/api/expenses`
- [x] Integrate AddExpenseModal and EditExpenseModal into DashboardView
- [x] Remove `supabase/` directory entirely
- [x] Remove `@supabase/supabase-js` dependency
- [x] Clean up tsconfig.json (remove supabase exclude)
- [x] Build passes cleanly

**Files created:**
- `app/api/expenses/route.ts` — GET (list) + POST (create)
- `app/api/expenses/[id]/route.ts` — PUT (update) + DELETE

**Files removed:**
- `supabase/functions/server/index.tsx`
- `supabase/functions/server/kv_store.tsx`

**Notes:**
- All API routes check `auth()` session and verify expense ownership before mutations
- Prisma `Decimal` fields are serialized to `Number` in API responses
- DashboardView now has full CRUD: add via modal, edit via modal, delete inline
- No Supabase dependencies remain in the project

---

## Step 5: Add Docker

**Goal:** Containerize the app for deployment on the Hetzner app server.

**Status: COMPLETED** (commit pending)

**Tasks:**
- [x] Create multi-stage `Dockerfile` (deps → build → production on node:22-alpine)
- [x] Create `docker-compose.yml` for local dev (app + PostgreSQL 16, port 5433)
- [x] Create `.dockerignore`
- [x] `output: 'standalone'` already set in `next.config.js` (Step 1)
- [x] Add `serverExternalPackages` for Prisma adapter, pg, and bcryptjs
- [x] Verify standalone build includes all runtime deps
- [x] Update Dockerfile CMD to run Prisma migrations at startup: `CMD ["sh", "-c", "prisma migrate deploy && node server.js"]`
- [x] Ensure `prisma` CLI is available in the production image (`npm install -g prisma` in runner stage)
- [x] Remove `docker-compose.prod.yml` (not needed with Coolify)
- [ ] Live `docker compose up` test (Docker daemon was not running — verify manually)

**Files created:**
- `Dockerfile` — 3-stage build, copies standalone + Prisma generated client, runs migrations at startup
- `docker-compose.yml` — local dev with PostgreSQL 16
- `.dockerignore`
- `public/` — empty directory (required by Next.js/Dockerfile)

**Files removed:**
- `docker-compose.prod.yml` — not needed; Coolify builds and runs from the Dockerfile directly

**Notes:**
- `serverExternalPackages` in next.config.js ensures `@prisma/adapter-pg`, `pg`, and `bcryptjs` are traced into the standalone output (not bundled away)
- Production image runs as non-root `nextjs` user
- docker-compose.yml exposes PostgreSQL on port 5433 to avoid conflicts with local installs
- `docker-compose.prod.yml` was created for a self-managed deployment but is unnecessary with Coolify — Coolify builds from the Dockerfile and manages the container lifecycle itself

---

## Step 6: Deployment Readiness

**Goal:** Prepare the app for deployment on the lr15a.pl platform (Coolify on Hetzner).

**Status: COMPLETED** (commit pending)

**Tasks:**
- [x] Add security headers to `next.config.js` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] Add health check endpoint (`GET /api/health`) for post-deploy verification
- [x] Update `.env.example` with empty placeholders for all required variables
- [x] Verify `package-lock.json` is committed (required by Coolify/Nixpacks)
- [x] Verify app listens on `0.0.0.0` (already set via `ENV HOSTNAME="0.0.0.0"` in Dockerfile)
- [x] Run `npm audit fix` — 0 vulnerabilities remaining
- [x] `npm run build` passes cleanly

**Files created:**
- `app/api/health/route.ts` — returns `{ status: "ok" }`

**Files modified:**
- `next.config.js` — added `headers()` with security headers
- `.env.example` — replaced sample values with empty placeholders

**Pre-deploy checklist:**
- [x] `npm ci && npm run build` succeeds locally with no errors
- [x] `package-lock.json` is committed
- [ ] No secrets in the codebase (`git log -p | grep -i secret`)
- [x] Dockerfile uses non-root user (`nextjs`)
- [x] `.env.example` exists with empty placeholders
- [x] Security headers configured in `next.config.js`
- [x] `npm audit` shows no critical vulnerabilities

---

## Step 7: Deploy to Coolify (Platform Admin)

**Goal:** Deploy the app to `portfello.lr15a.pl` via Coolify.

Coolify handles building, running, SSL (Let's Encrypt), and routing automatically.
DNS is covered by the `*.lr15a.pl` wildcard — no action needed.

**Tasks (done by platform admin):**
- [ ] Create database on the DB server using the provisioning script
- [ ] Add app in Coolify: Projects → Add Resource → select `portfello` repo → set domain to `portfello.lr15a.pl`
- [ ] Set environment variables in Coolify dashboard:
  - `DATABASE_URL` — provided by platform admin after database creation
  - `AUTH_SECRET` — generated unique secret (32+ random bytes)
  - `AUTH_URL` — the app's public URL
- [ ] Deploy: push to `main` or trigger manually in Coolify
- [ ] Verify health check: `curl https://portfello.lr15a.pl/api/health`
- [ ] Verify HTTPS works (auto-provisioned by Coolify via Let's Encrypt)

**Notes:**
- No GitHub Actions CI/CD pipeline needed — Coolify auto-deploys on push to `main` via GitHub webhook
- No manual Caddy/reverse-proxy configuration needed — Coolify handles routing
- No ghcr.io push needed — Coolify builds the Dockerfile on the server itself
- Subsequent pushes to `main` auto-deploy

---

## Updated .env.example (Post-Migration)

```env
# Database (PostgreSQL on Hetzner DB server, private network, SSL required)
DATABASE_URL=

# Auth.js
AUTH_SECRET=
AUTH_URL=

# Optional: OAuth providers (add later)
# AUTH_GOOGLE_ID=
# AUTH_GOOGLE_SECRET=
# AUTH_GITHUB_ID=
# AUTH_GITHUB_SECRET=
```

**Note:** These values are set in the Coolify dashboard per app — never committed to the repo. The `.env.example` file uses empty/placeholder values for documentation only.

---

## What Carries Over Unchanged

- All shadcn/ui components (`components/ui/`)
- Tailwind config + design tokens (`globals.css`)
- Dashboard, Analytics, Sidebar UI components (minor import path adjustments)
- Recharts visualizations
- Form validation logic (React Hook Form + Zod)

---

## Cleanup After Migration

- [ ] Remove `supabase/` directory (done in Step 4)
- [ ] Remove `@supabase/supabase-js` from `package.json` (done in Step 4)
- [x] Remove `docker-compose.prod.yml` (done in Step 5)
- [ ] Remove Figma-specific component (`components/figma/ImageWithFallback.tsx`) if unused
- [ ] Audit `package.json` for unused dependencies
