# Development Log

Project: Portfello
Started: 2026-04-02

## Session Guidelines
- Each session starts with a todo list
- Each completed todo gets a commit
- Each commit gets a log entry
- No exceptions to the above rules

---

## Session: 2026-04-02 23:40

### Todo List:
- [x] Diagnose production auth failure ("Account created but login failed")
- [x] Fix Auth.js configuration for reverse proxy

### Changes:

#### 23:42 - Fix Auth.js trustHost for production reverse proxy
**Files Modified**: 
- `auth.ts` - Added `trustHost: true` to NextAuth config

**Details**:
- Root cause: Auth.js CSRF validation fails behind Coolify's reverse proxy without `trustHost: true`
- The `signIn()` client-side call goes through the proxy, but Auth.js didn't trust forwarded headers
- This caused URL mismatch between client (HTTPS public URL) and server (HTTP internal URL)
- Fix: single line addition of `trustHost: true` to NextAuth config

---

## Session: 2026-04-03 11:00

### Todo List:
- [x] Assess codebase against Coolify deployment requirements
- [x] Swap dependencies: remove Prisma, add Drizzle
- [x] Create Drizzle schema, client, and config
- [x] Generate baseline migration (no-op for existing tables)
- [x] Convert all Prisma queries to Drizzle (auth, signup, expenses)
- [x] Update config files (next.config.js, Dockerfile, .gitignore, .dockerignore, vitest.config.ts)
- [x] Delete Prisma artifacts (prisma/, prisma.config.ts, generated/, lib/prisma.ts)
- [x] Verify: tests, types, build, docker build

### Changes:

#### 11:05 - Swap dependencies from Prisma to Drizzle
**Files Modified**: 
- `package.json` - Removed @auth/prisma-adapter, @prisma/adapter-pg, @prisma/client, prisma; Added @auth/drizzle-adapter, drizzle-orm, drizzle-kit, pg, @types/pg; Replaced postinstall with db:* scripts

**Details**:
- drizzle-kit in dependencies (not devDependencies) because it runs at container startup for migrations
- pg now explicit dependency (was transitive via @prisma/adapter-pg)

#### 11:08 - Create Drizzle schema, client, and config
**Files Created**: 
- `lib/schema.ts` - All 5 tables (users, accounts, sessions, verification_tokens, expenses) with relations
- `lib/db.ts` - Drizzle client singleton with dev HMR protection
- `drizzle.config.ts` - Drizzle Kit config pointing to lib/schema.ts

**Details**:
- Schema matches existing Prisma-managed DB exactly (table names, column names, types, constraints)
- accounts table keeps id PK (differs from DrizzleAdapter default composite PK) - uses type assertion for adapter compatibility
- Relations defined for relational query API (db.query.*.findFirst/findMany)

#### 11:10 - Generate baseline migration
**Files Created**: 
- `drizzle/0000_tough_roulette.sql` - No-op baseline (SELECT 1)
- `drizzle/meta/` - Drizzle migration journal

**Details**:
- Generated migration then replaced SQL with no-op since tables already exist from Prisma
- On first deploy, drizzle-kit migrate records it as applied without executing DDL

#### 11:12 - Convert all Prisma queries to Drizzle
**Files Modified**: 
- `auth.ts` - PrismaAdapter -> DrizzleAdapter with explicit table mapping; prisma.user.findUnique -> db.query.users.findFirst
- `app/(auth)/signup/action.ts` - prisma.user.findUnique/create -> db.query.users.findFirst / db.insert(users).values()
- `app/api/expenses/route.ts` - prisma.expense.findMany/create -> db.query.expenses.findMany / db.insert(expenses).returning()
- `app/api/expenses/[id]/route.ts` - prisma.expense.findFirst/update/delete -> Drizzle equivalents with eq/and operators

**Details**:
- Drizzle decimal columns return strings (existing Number() serialization handles this)
- Date column handling: Drizzle date mode:'date' may return string in some cases, added defensive handling
- $onUpdate(() => new Date()) replaces Prisma's @updatedAt

#### 11:14 - Update config files and Dockerfile
**Files Modified**: 
- `next.config.js` - Removed @prisma/adapter-pg from serverExternalPackages
- `Dockerfile` - Removed Prisma-specific steps (prisma generate, prisma.config.ts copy, generated/ copy); Added drizzle/ copy; CMD now runs drizzle-kit migrate
- `.gitignore` - Removed /generated/prisma
- `.dockerignore` - Removed generated
- `vitest.config.ts` - Removed generated/** from coverage exclude

#### 11:15 - Delete Prisma artifacts
**Files Deleted**: 
- `lib/prisma.ts`, `prisma/` (schema + migrations), `prisma.config.ts`, `generated/prisma/`

#### 11:16 - Verify: tests, types, build, docker build
**Results**:
- npm test: 10/10 tests pass
- tsc --noEmit: 0 errors
- npm run build: Success (all routes compiled)
- docker build: Success (image built)

---
