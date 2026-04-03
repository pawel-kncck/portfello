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

## Session: 2026-04-03 14:00

### Todo List:
- [x] Replace empty baseline migration with proper initial migration

### Changes:

#### 14:00 - Replace empty baseline migration with real CREATE TABLE statements
**Files Deleted**: 
- `drizzle/0000_tough_roulette.sql` - Empty baseline migration (SELECT 1)
- `drizzle/meta/0000_snapshot.json` - Old snapshot

**Files Created**: 
- `drizzle/0000_cooing_sunset_bain.sql` - Full initial migration with all CREATE TABLE statements
- `drizzle/meta/0000_snapshot.json` - Updated snapshot

**Files Modified**:
- `drizzle/meta/_journal.json` - Reset entries, then regenerated via drizzle-kit generate

**Details**:
- The previous migration was an empty no-op (SELECT 1) that assumed tables already existed from Prisma
- On a fresh database, this meant no tables would be created, causing the app to fail
- Ran `npx drizzle-kit generate` to produce a proper migration from the Drizzle schema
- New migration creates all 5 tables (users, accounts, sessions, verification_tokens, expenses) with proper columns, constraints, foreign keys, and indexes

---

## Session: 2026-04-03 19:30

### Todo List:
- [x] Create collapsible mobile sidebar with hamburger menu toggle
- [x] Update app layout for responsive sidebar margin
- [x] Optimize DashboardView header and expense list for mobile
- [x] Optimize AnalyticsView header and charts for mobile
- [x] Optimize ExpenseList item layout for mobile
- [x] Add mobile-friendly touch targets and spacing
- [x] Write tests for mobile UI components

### Changes:

#### 19:35 - Add collapsible mobile sidebar with hamburger toggle
**Commit**: `781a49f` - `feat(sidebar): add collapsible mobile sidebar with hamburger toggle`
**Files Modified**: 
- `components/AppSidebar.tsx` - Complete rewrite for mobile-responsive sidebar
- `app/(app)/layout.tsx` - Responsive margin (ml-0 md:ml-64) and mobile top padding

**Details**:
- Sidebar hidden on mobile (<768px), slides in from left via CSS translate
- Hamburger menu button fixed in top-left corner on mobile
- Backdrop overlay with blur effect closes sidebar on tap
- Escape key and route changes auto-close sidebar
- Body scroll locked when mobile sidebar is open
- Desktop behavior unchanged (always visible fixed sidebar)

#### 19:38 - Optimize DashboardView for mobile
**Commit**: `2a6b852` - `feat(dashboard): optimize DashboardView for mobile screens`
**Files Modified**: 
- `components/DashboardView.tsx` - Responsive header, button, and expense list items

**Details**:
- Header stacks vertically on mobile (flex-col), inline on sm+
- Add Expense button full-width on mobile
- Expense list items stack vertically with proper truncation
- Responsive text sizes (text-2xl sm:text-3xl)

#### 19:40 - Optimize AnalyticsView for mobile
**Commit**: `825136b` - `feat(analytics): optimize AnalyticsView for mobile screens`
**Files Modified**: 
- `components/AnalyticsView.tsx` - Responsive header, select, and chart heights

**Details**:
- Header stacks vertically on mobile
- Time range select full-width on mobile
- Chart heights reduced on mobile (h-64 vs h-80)
- Smaller pie chart radius for better fit

#### 19:41 - Optimize ExpenseList for mobile
**Commit**: `b0e681e` - `feat(expenses): optimize ExpenseList layout for mobile screens`
**Files Modified**: 
- `components/ExpenseList.tsx` - Responsive expense items and month headers

**Details**:
- Expense items stack vertically on mobile, inline on sm+
- Flex-wrap on badge/amount/date row
- Responsive text sizes and spacing

#### 19:42 - Add touch-friendly targets and viewport config
**Commit**: `5c43af6` - `feat(mobile): add touch-friendly targets, viewport config, and dialog improvements`
**Files Modified**: 
- `app/layout.tsx` - Added viewport export with maximum-scale=1
- `styles/globals.css` - Min 44px touch targets, 16px input font on mobile
- `components/ui/dialog.tsx` - Scrollable content with max-h-90vh

#### 19:43 - Add tests for mobile sidebar
**Commit**: `b98aa19` - `test(sidebar): add tests for mobile sidebar toggle behavior`
**Files Created**: 
- `tests/components/AppSidebar.test.tsx` - 10 tests for sidebar mobile behavior

**Details**:
- Tests: rendering, toggle open/close, backdrop dismiss, escape key, close button, body scroll lock, user info display
- All 19 tests passing (10 new + 9 existing)

---
