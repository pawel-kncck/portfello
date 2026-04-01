# Migration Plan: Portfello → Self-Hosted (Tier 2 Hetzner)

## Overview

Migrate Portfello from a Vite SPA + Supabase stack to a Next.js + PostgreSQL + Auth.js stack, containerized with Docker, and auto-deployed to Hetzner via GitHub Actions.

**Current stack:** Vite SPA, Supabase Auth, Supabase Edge Functions (Hono/Deno), Supabase KV store
**Target stack:** Next.js, Auth.js, PostgreSQL, Drizzle ORM, Docker, Caddy, GitHub Actions

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

## Step 2: Set Up Drizzle + PostgreSQL Schema

**Goal:** Replace Supabase KV store with a proper relational schema.

**Tasks:**
- [ ] Install Drizzle ORM + `drizzle-kit` + `pg` driver
- [ ] Define schema in `db/schema.ts`:
  - `users` table (id, email, name, password_hash, created_at)
  - `sessions` table (for Auth.js)
  - `expenses` table (id, user_id FK, amount, category, description, date, created_at, updated_at)
- [ ] Configure Drizzle connection (`db/index.ts`) reading `DATABASE_URL` from env
- [ ] Generate initial migration with `drizzle-kit generate`
- [ ] Add `drizzle.config.ts`
- [ ] Update `.env.example` with `DATABASE_URL` placeholder
- [ ] Test migration against a local PostgreSQL instance

**Schema — expenses table:**
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
```

---

## Step 3: Wire Up Auth.js

**Goal:** Replace Supabase Auth with Auth.js (NextAuth v5).

**Tasks:**
- [ ] Install `next-auth` and `@auth/drizzle-adapter`
- [ ] Configure Auth.js in `auth.ts` with Drizzle adapter
- [ ] Set up `Credentials` provider (email + password with bcrypt)
- [ ] Add Auth.js session/account/verification tables to Drizzle schema
- [ ] Create middleware (`middleware.ts`) to protect `/dashboard` and `/analytics` routes
- [ ] Update Login and Signup forms to call Auth.js `signIn()` / server action
- [ ] Update `.env.example` with `AUTH_SECRET` and `AUTH_URL` placeholders
- [ ] Remove all Supabase Auth client SDK usage from the frontend

**Files created:**
- `auth.ts`, `middleware.ts`
- `app/api/auth/[...nextauth]/route.ts`

**Files removed:**
- `utils/supabase/info.tsx`
- Supabase client initialization in `App.tsx`

---

## Step 4: Rewrite API Endpoints as Next.js Route Handlers

**Goal:** Replace Supabase Edge Functions with Next.js API routes using Drizzle.

**Current endpoints → New routes:**

| Current (Hono/Deno) | New (Next.js) |
|---|---|
| `POST /signup` | Handled by Auth.js (Step 3) |
| `GET /expenses` | `GET /api/expenses` |
| `POST /expenses` | `POST /api/expenses` |
| `PUT /expenses/:id` | `PUT /api/expenses/[id]` |
| `DELETE /expenses/:id` | `DELETE /api/expenses/[id]` |

**Tasks:**
- [ ] Create `app/api/expenses/route.ts` (GET list, POST create)
- [ ] Create `app/api/expenses/[id]/route.ts` (PUT update, DELETE)
- [ ] Use Drizzle queries instead of KV store operations
- [ ] Auth via `auth()` session helper (no more manual Bearer token parsing)
- [ ] Update frontend components to call `/api/expenses` instead of Supabase function URLs
- [ ] Remove `supabase/functions/` directory entirely
- [ ] Remove `@supabase/supabase-js` dependency

**Files removed:**
- `supabase/functions/server/index.tsx`
- `supabase/functions/server/kv_store.tsx`

---

## Step 5: Add Docker

**Goal:** Containerize the app for deployment on the Hetzner app server.

**Tasks:**
- [ ] Create multi-stage `Dockerfile`:
  - Stage 1: Install dependencies
  - Stage 2: Build Next.js (`next build` with `output: 'standalone'`)
  - Stage 3: Production image (minimal Node.js alpine)
- [ ] Create `docker-compose.yml` for local development:
  - `app` service (Next.js, port 3000)
  - `db` service (PostgreSQL 16, port 5432, persistent volume)
- [ ] Create `docker-compose.prod.yml` (app-only, connects to remote DB via `DATABASE_URL`)
- [ ] Add `.dockerignore` (node_modules, .next, .git, .env)
- [ ] Add `output: 'standalone'` to `next.config.js`
- [ ] Verify `docker compose up` works end-to-end locally

---

## Step 6: Add GitHub Actions CI/CD

**Goal:** Auto-deploy to Hetzner on push to `main`.

**Tasks:**
- [ ] Create `.github/workflows/deploy.yml`:
  1. Build Docker image
  2. Push to GitHub Container Registry (`ghcr.io`)
  3. SSH into Hetzner app server
  4. Pull new image and restart container via `docker compose up -d`
- [ ] Add required GitHub repository secrets:
  - `HETZNER_SSH_KEY` — private key for SSH access to app server
  - `HETZNER_HOST` — app server IP or hostname
  - `HETZNER_USER` — SSH user on app server
  - `DATABASE_URL` — connection string to DB server over private network
  - `AUTH_SECRET` — Auth.js secret
- [ ] Add health check endpoint (`GET /api/health`) for post-deploy verification
- [ ] Test full pipeline: push → build → deploy → verify

**Workflow outline:**
```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Log in to ghcr.io
      - Build and push Docker image
      - SSH to Hetzner and pull/restart
      - Verify health check
```

---

## Step 7: Caddy Configuration on Hetzner

**Goal:** Route traffic from a subdomain to the Portfello container.

**Tasks:**
- [ ] Choose subdomain (e.g., `portfello.yourdomain.com`)
- [ ] Add DNS A record pointing to the Hetzner app server IP
- [ ] Add entry to the existing Caddyfile on the app server:
  ```
  portfello.yourdomain.com {
      reverse_proxy portfello-app:3000
  }
  ```
- [ ] Reload Caddy to pick up the new config
- [ ] Verify HTTPS works (Caddy auto-provisions Let's Encrypt cert)

---

## Updated .env.example (Post-Migration)

```env
# Database (PostgreSQL on Hetzner DB server)
DATABASE_URL=postgresql://portfello_user:password@db-private-ip:5432/portfello_db

# Auth.js
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=https://portfello.yourdomain.com

# Optional: OAuth providers (add later)
# AUTH_GOOGLE_ID=
# AUTH_GOOGLE_SECRET=
# AUTH_GITHUB_ID=
# AUTH_GITHUB_SECRET=
```

---

## What Carries Over Unchanged

- All shadcn/ui components (`components/ui/`)
- Tailwind config + design tokens (`globals.css`)
- Dashboard, Analytics, Sidebar UI components (minor import path adjustments)
- Recharts visualizations
- Form validation logic (React Hook Form + Zod)

---

## Cleanup After Migration

- [ ] Remove `supabase/` directory
- [ ] Remove `@supabase/supabase-js` from `package.json`
- [ ] Remove `utils/supabase/` directory
- [ ] Remove `vite.config.ts`, `postcss.config.js` (if recreated by Next.js)
- [ ] Remove old `App.tsx` (replaced by Next.js layout/pages)
- [ ] Remove `components/Auth.tsx` (unused even before migration)
- [ ] Remove Figma-specific component (`components/figma/ImageWithFallback.tsx`) if unused
- [ ] Audit `package.json` for unused dependencies
