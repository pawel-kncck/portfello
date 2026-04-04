# Testing Strategy: Analysis & Implementation Plan

**Date:** 2026-04-04
**Scope:** Portfello — Expense tracking app with shared wallets

---

## 1. Current State Analysis

### 1.1 What Exists

| Area | Files | Lines | Coverage |
|------|-------|-------|----------|
| Unit tests | 5 | 811 | Zod schemas, rule engine evaluation, i18n translations |
| Component tests | 5 | 618 | LoginForm, AppSidebar, WalletSwitcher, SettingsView, WalletSettingsView |
| API route tests | 0 | 0 | — |
| Integration tests | 0 | 0 | — |
| E2E tests | 0 | 0 | — |

**Tooling already in place:** Vitest 4.1.2, jsdom, @testing-library/react + user-event, @vitest/coverage-v8.

### 1.2 What's Missing (by risk)

**Critical — business logic with zero coverage:**
- All 16 API route handlers (auth guards, input validation, DB operations, membership checks)
- Wallet membership enforcement (`lib/wallet/membership.ts`)
- Expense CRUD (create, update, delete with wallet-scoped access control)
- Category tree building (parent/child hierarchy in `GET /api/wallets/[id]/categories`)
- Rule CRUD and reorder endpoint

**High — user-facing components with complex state:**
- `AddExpenseModal` / `EditExpenseModal` (form validation, async submission, error display)
- `ExpenseList` (grouping by month, edit/delete actions, empty/loading states)
- `CategoryManager` / `TagManager` / `RuleManager` (CRUD modals, API calls, optimistic updates)
- `DashboardView` / `AnalyticsView` (data fetching, chart rendering)
- `SignupForm` (registration flow, error handling)

**Medium — partially tested areas:**
- Rule engine — schema validation tested, but `evaluateRules()` edge cases around combined conditions could use more coverage
- i18n — translation key parity tested, but component-level locale switching is not

### 1.3 Architectural Observations

Every API route follows the same pattern:
1. `auth()` → 401 if no session
2. Parse + validate body with Zod → 400 on failure
3. `checkWalletMembership()` → 404 if not a member
4. DB operation via Drizzle → return JSON

This uniformity is a **testing advantage** — a shared test helper can cover the auth/membership boilerplate, letting individual tests focus on business logic.

Components consistently depend on three context providers (`useI18n`, `useWallet`, `useSession`), already mocked in existing tests. These mocks can be extracted into a shared `renderWithProviders` helper.

---

## 2. Recommended Strategy

### 2.1 Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  ~5 critical user flows (Playwright)
        │  tests  │  Run: CI only, on merge to main
       ┌┴─────────┴┐
       │ Integration │  API route handlers (~40 tests)
       │   tests     │  Run: CI on every push
      ┌┴─────────────┴┐
      │  Component     │  React components (~60 tests)
      │   tests        │  Run: locally + CI
     ┌┴────────────────┴┐
     │   Unit tests      │  Schemas, utils, engine (~80 tests)
     │                   │  Run: locally + CI
     └───────────────────┘
```

**Target:** ~185 tests total. This is achievable incrementally without blocking feature work.

### 2.2 Unit Tests — expand coverage on pure logic

**What to test:** Functions with no side effects or easily-mockable dependencies.

| Target | File | Tests to Add |
|--------|------|-------------|
| `serializeExpense()` | `app/api/expenses/route.ts` | Date handling (Date object vs string), amount string→number conversion, null description |
| `evaluateRules()` combined conditions | `lib/rules/engine.ts` | Multiple conditions AND'd together, empty rules array, all rules disabled |
| Category tree builder | `app/api/wallets/[id]/categories/route.ts` | Extract tree-building logic into `lib/categories/tree.ts` and unit test: flat→tree, orphaned parentId, single root, deep nesting |
| Expense grouping by month | `components/ExpenseList.tsx` | Extract grouping logic into a utility, test: empty array, single month, multiple months, date edge cases |

**Key principle:** If logic is embedded in a route handler or component, extract it into a pure function in `lib/` and test there. This improves both testability and reusability.

### 2.3 API Route (Integration) Tests — the biggest gap

**Approach:** Test route handlers by calling the exported `GET`/`POST`/`PUT`/`DELETE` functions directly, mocking `auth()` and `db` at the module level.

**Why not HTTP-level testing?** Next.js App Router route handlers are just async functions that accept `Request` and return `Response`. Direct invocation is faster, simpler, and doesn't require spinning up a server.

**Mock strategy:**

```typescript
// tests/helpers/api.ts
import { vi } from 'vitest'

// Mock auth — reusable across all route tests
export function mockAuth(user: { id: string; email: string } | null) {
  vi.mocked(auth).mockResolvedValue(
    user ? { user, expires: '' } : null
  )
}

// Mock db.query.*.findFirst / findMany / insert / update / delete
// Use a lightweight in-memory store or simple vi.fn() per test
```

**Test matrix per route (template):**

| Scenario | Expected |
|----------|----------|
| No session | 401 |
| Valid session, not a wallet member | 404 |
| Valid session + member, invalid body | 400 with Zod error |
| Valid session + member, valid body | 201/200 + correct response shape |
| Valid session + member, duplicate/conflict | 409 (where applicable) |

**Priority order for route testing:**

1. **`/api/expenses`** — core CRUD, most user-facing
2. **`/api/wallets/[id]/categories`** — tree building logic, uniqueness constraint
3. **`/api/wallets`** — wallet creation triggers auto-membership
4. **`/api/wallets/[id]/rules`** + `/reorder` — conditions/actions JSON validation
5. **`/api/wallets/[id]/tags`** — simpler CRUD, good for pattern validation
6. **`/api/wallets/[id]/members`** — invitation flow, role checks
7. **`/api/settings`** — user preferences
8. **`/api/expenses/[id]`** — ownership checks on update/delete

### 2.4 Component Tests — cover the interactive components

**Shared test infrastructure to build first:**

```typescript
// tests/helpers/render.tsx
import { render } from '@testing-library/react'
// Pre-configure all context providers (i18n, wallet, session)
// Accept overrides per test
export function renderWithProviders(ui: React.ReactElement, options?: {
  locale?: 'pl' | 'en',
  wallets?: Wallet[],
  activeWalletId?: string,
  session?: Session | null,
}) { /* ... */ }
```

**Component test priorities:**

| Priority | Component | Key scenarios |
|----------|-----------|--------------|
| P0 | `AddExpenseModal` | Renders fields, validates empty amount, validates negative amount, submits successfully, shows API error, closes on success |
| P0 | `EditExpenseModal` | Pre-fills existing data, submits changes, handles delete confirmation |
| P0 | `ExpenseList` | Loading skeleton, empty state, renders grouped expenses, triggers edit/delete callbacks |
| P1 | `SignupForm` | Validates email, validates password length, submits, shows error |
| P1 | `CategoryManager` | Fetches and displays categories, adds new category, handles color picker |
| P1 | `TagManager` | Similar CRUD pattern to CategoryManager |
| P1 | `RuleManager` | Renders rule list, condition/action forms, enable/disable toggle |
| P2 | `DashboardView` | Renders expense summary, handles loading state, calls API on mount |
| P2 | `AnalyticsView` | Renders charts with sample data, handles empty data, date range selection |

### 2.5 E2E Tests — validate critical user journeys

**Tool recommendation:** Playwright. It supports Next.js natively, runs headless in CI, and has excellent TypeScript support.

**Setup:** Run against a Docker Compose stack with a real PostgreSQL instance seeded with test data. Use `globalSetup` to seed the DB and create a test user session.

**Critical flows (5 tests):**

| # | Flow | Steps |
|---|------|-------|
| 1 | **Signup → Login** | Register new user → redirect to login → login → see dashboard |
| 2 | **Add expense** | Login → open modal → fill form → submit → see expense in list |
| 3 | **Edit + delete expense** | Login → click edit on existing expense → change amount → save → delete → confirm gone |
| 4 | **Shared wallet flow** | Login as user A → create shared wallet → invite user B → login as B → see shared wallet |
| 5 | **Category rules** | Login → go to wallet settings → create category → create rule → add expense matching rule → verify auto-categorization |

**E2E tests are the lowest priority** — implement after unit and integration coverage is solid. They catch integration bugs that lower layers miss, but are slow and brittle if run too early.

---

## 3. Implementation Plan

### Phase 1: Test Infrastructure (1-2 days)

- [ ] **Extract shared test helpers**
  - Create `tests/helpers/render.tsx` — `renderWithProviders()` with i18n, wallet, session mocks
  - Create `tests/helpers/api.ts` — `mockAuth()`, `mockDb()` helpers
  - Refactor existing 5 component tests to use `renderWithProviders` (eliminate duplicate mock setup)

- [ ] **Extract pure logic from route handlers**
  - `lib/categories/tree.ts` — category tree builder (from `app/api/wallets/[id]/categories/route.ts`)
  - `lib/expenses/serialize.ts` — `serializeExpense()` (from `app/api/expenses/route.ts`)
  - Move expense grouping logic from `ExpenseList.tsx` to `lib/expenses/group.ts`

- [ ] **Configure coverage thresholds in `vitest.config.ts`**
  ```typescript
  coverage: {
    thresholds: {
      statements: 50,  // raise to 70 after Phase 2, 80 after Phase 3
      branches: 50,
      functions: 50,
      lines: 50,
    },
  }
  ```

### Phase 2: Unit + API Route Tests (3-5 days)

- [ ] **Unit tests for extracted utilities**
  - `tests/unit/serialize-expense.test.ts` — Date/amount edge cases
  - `tests/unit/category-tree.test.ts` — Tree construction edge cases
  - `tests/unit/expense-grouping.test.ts` — Month grouping logic

- [ ] **API route tests — expenses (highest value)**
  - `tests/api/expenses.test.ts`
    - GET: unauthenticated → 401, no wallet membership → 404, valid → returns expenses
    - POST: unauthenticated → 401, invalid body → 400, not member → 404, valid → 201
  - `tests/api/expenses-id.test.ts`
    - PUT: ownership check, valid update
    - DELETE: ownership check, successful deletion

- [ ] **API route tests — wallets + categories + tags**
  - `tests/api/wallets.test.ts` — CRUD + auto-membership on create
  - `tests/api/categories.test.ts` — CRUD + parent validation + uniqueness constraint (409)
  - `tests/api/tags.test.ts` — CRUD

- [ ] **API route tests — rules + members**
  - `tests/api/rules.test.ts` — CRUD + conditions/actions schema validation
  - `tests/api/rules-reorder.test.ts` — Priority reordering
  - `tests/api/members.test.ts` — Add/remove members

- [ ] **Raise coverage thresholds to 70%**

### Phase 3: Component Tests (3-4 days)

- [ ] **P0 components**
  - `tests/components/AddExpenseModal.test.tsx`
  - `tests/components/EditExpenseModal.test.tsx`
  - `tests/components/ExpenseList.test.tsx`

- [ ] **P1 components**
  - `tests/components/SignupForm.test.tsx`
  - `tests/components/CategoryManager.test.tsx`
  - `tests/components/TagManager.test.tsx`
  - `tests/components/RuleManager.test.tsx`

- [ ] **P2 components**
  - `tests/components/DashboardView.test.tsx`
  - `tests/components/AnalyticsView.test.tsx`

- [ ] **Raise coverage thresholds to 80%**

### Phase 4: E2E Tests (2-3 days)

- [ ] **Install and configure Playwright**
  - `npm install -D @playwright/test`
  - Create `playwright.config.ts` with `webServer` pointing to `next dev`
  - Create `docker-compose.test.yml` for isolated Postgres
  - Create `tests/e2e/helpers/seed.ts` for DB seeding

- [ ] **Implement 5 critical flows**
  - `tests/e2e/signup-login.spec.ts`
  - `tests/e2e/add-expense.spec.ts`
  - `tests/e2e/edit-delete-expense.spec.ts`
  - `tests/e2e/shared-wallet.spec.ts`
  - `tests/e2e/category-rules.spec.ts`

- [ ] **Add CI pipeline stage for E2E** (runs on merge to main only)

---

## 4. CI Integration

```yaml
# Suggested GitHub Actions workflow additions
test:
  steps:
    - npm ci
    - npm run test          # unit + component + API route tests
    - npm run test:coverage # enforce thresholds

test-e2e:                   # separate job, runs on main only
  services:
    postgres: ...
  steps:
    - npm ci
    - npx playwright install
    - npm run build
    - npx playwright test
```

---

## 5. Testing Conventions

### File naming
- Unit: `tests/unit/<module>.test.ts`
- API routes: `tests/api/<resource>.test.ts`
- Components: `tests/components/<ComponentName>.test.tsx`
- E2E: `tests/e2e/<flow-name>.spec.ts`

### Test structure
```typescript
describe('<Module or Component>', () => {
  describe('<method or scenario group>', () => {
    it('should <expected behavior> when <condition>', () => {
      // Arrange → Act → Assert
    })
  })
})
```

### Mocking rules
- **Mock at module boundaries**, not inside functions: `vi.mock('@/lib/db')`, `vi.mock('@/auth')`
- **Never mock the thing you're testing** — if testing a route handler, mock its dependencies (auth, db), not the handler itself
- **Prefer real implementations** for Zod schemas, i18n translations, and pure utility functions
- **Reset mocks between tests**: `beforeEach(() => vi.clearAllMocks())`

### What NOT to test
- Shadcn/ui primitives (`components/ui/*`) — tested by the library maintainers
- Drizzle ORM query building — trust the ORM; test the business logic around it
- NextAuth internal flow — mock `auth()` and test your code's response to its output
- CSS / visual layout — use E2E visual regression only if/when needed

---

## 6. Estimated Impact

| Metric | Current | After Phase 2 | After Phase 4 |
|--------|---------|---------------|---------------|
| Test files | 10 | ~25 | ~32 |
| Total tests | ~55 | ~135 | ~185 |
| API route coverage | 0% | ~85% | ~85% |
| Component coverage | 18.5% (5/27) | 18.5% | ~70% (19/27) |
| Line coverage (est.) | ~15% | ~55% | ~80% |
| E2E flows | 0 | 0 | 5 |

---

## 7. Quick Wins (do first)

If time is limited, these three actions deliver the most value per hour invested:

1. **Create `tests/helpers/render.tsx`** — eliminates ~80 lines of duplicate mock setup across existing tests and makes writing new component tests 3x faster.

2. **Write API tests for `POST /api/expenses`** — this is the most critical write path in the app. Testing auth guard + validation + membership check + DB insert catches the highest-severity bugs.

3. **Extract and test `serializeExpense()` and category tree builder** — these are pure functions buried in route handlers. Extracting them improves code quality and gives you easy, fast unit tests with high confidence value.
