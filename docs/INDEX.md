# Portfello Documentation Index

> For AI coding agents: start here to find what you need.

## Quick orientation

- **What it is**: Expense tracking app with shared wallets for couples/families
- **Stack**: Next.js 16, TypeScript, Drizzle ORM, PostgreSQL 16, Auth.js v5
- **Structure**: Single Next.js app with App Router (not a monorepo)
- **Entry points**: `app/` (routes), `lib/` (shared logic), `lib/schema.ts` (data model)

## Documentation map

| Need to understand... | Read | Source of truth |
|---|---|---|
| Data model & relationships | [architecture/data-model.md](architecture/data-model.md) | `lib/schema.ts` |
| API endpoints & contracts | [architecture/api.md](architecture/api.md) | Route handlers in `app/api/` |
| Tech stack & choices | [architecture/tech-stack.md](architecture/tech-stack.md) | `package.json` |
| How it's deployed | [architecture/deployment.md](architecture/deployment.md) | `Dockerfile` + Coolify config |
| AI architecture (design, not built) | [architecture/ai-integration.md](architecture/ai-integration.md) | This file (design doc) |
| What's planned but not built | [plans/roadmap.md](plans/roadmap.md) | Plan files in `plans/` |
| Past deployment mistakes | [learnings/deployment-lessons.md](learnings/deployment-lessons.md) | This file |

## Key files an agent should read first

1. `CLAUDE.md` — commit rules, logging, testing requirements
2. `lib/schema.ts` — the real data model (Drizzle ORM)
3. `docs/INDEX.md` — this file
4. `docs/architecture/data-model.md` — explains relationships and business rationale

## Codebase layout

```
app/
  (app)/              # Protected routes (dashboard, analytics, settings, wallet-settings)
  (auth)/             # Public routes (login, signup)
  api/                # API route handlers
    auth/             # NextAuth handler
    expenses/         # Expense CRUD
    wallets/          # Wallet CRUD + nested resources (members, categories, tags, rules)
    settings/         # User preferences
    health/           # Health check (no auth)
components/           # React components (sidebar, modals, managers, forms)
lib/
  schema.ts           # Drizzle ORM schema — canonical data model
  db.ts               # Database connection singleton
  rules/engine.ts     # Categorization rule evaluation engine
  wallet/             # Wallet context + membership check utility
  i18n/               # Internationalization (Polish, English)
drizzle/              # Migration files
tests/
  unit/               # Validation schemas, rule engine, i18n
  components/         # React component tests
```

## What exists vs. what's planned

**Implemented**: Authentication, wallets (personal + shared), expenses CRUD, hierarchical categories, tags, categorization rules engine, dashboard, analytics (pie + bar charts), i18n (pl/en), user settings

**Not implemented** (see `plans/`): CSV import, email ingestion, AI categorization, document management, cost reductions (expense direction/type), deduplication, bank accounts, API token auth, mobile app
