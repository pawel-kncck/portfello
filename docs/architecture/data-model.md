# Data Model

> Source of truth: `lib/schema.ts` (Drizzle ORM). If this document conflicts with the schema, the schema wins.

## Entity relationship overview

```
User ──< WalletMember >── Wallet
  │                         │
  │                         ├──< Expense ──< ExpenseTag >── Tag
  │                         ├──< Category (self-referential hierarchy)
  │                         ├──< Tag
  │                         └──< Rule
  │
  └──< Account (Auth.js OAuth — not used with Credentials provider)
```

## Core entities

### User

Auth.js-managed user record. Extended with `passwordHash` (Credentials provider), `language`, and `currency` preferences.

- `id`: UUID text PK
- `email`: unique, required
- `passwordHash`: bcrypt hash (nullable — Auth.js schema allows null for OAuth users)
- `language`: `'pl'` | `'en'` (default: `'pl'`)
- `currency`: `'PLN'` | `'USD'` (default: `'PLN'`)

### Wallet

The core organizational unit. All data (expenses, categories, tags, rules) is scoped to a wallet.

- `type`: `'personal'` | `'shared'`

**Invariants:**
- A personal wallet has exactly one member (the owner). It is created automatically at signup.
- A personal wallet cannot be deleted or converted to shared.
- A shared wallet has one owner (the creator) and zero or more additional members.
- All members see all data in the wallet — there is no per-expense ownership restriction.

### WalletMember

Join table between User and Wallet with a role.

- `role`: `'owner'` | `'member'`
- Unique constraint: `(walletId, userId)` — a user can only be in a wallet once

**Role permissions:**

| Action | Owner | Member |
|---|---|---|
| View all wallet data | Yes | Yes |
| Add/edit/delete expenses | Yes | Yes |
| Manage categories, tags, rules | Yes | Yes |
| Invite/remove members | Yes | No |
| Delete wallet | Yes | No |

### Expense

A financial transaction belonging to a wallet.

- `amount`: Decimal(10,2), always positive
- `category`: varchar(50) — stores the category name as a string (not a FK to categories table)
- `date`: date type
- `description`: optional, text

**Design note:** `category` is a denormalized string, not a foreign key to the categories table. This means renaming a category does not automatically update existing expenses. This is a known tradeoff — see [plans/cost-reductions.md](../plans/cost-reductions.md) for the planned schema evolution that will add `categoryId` as a proper FK.

**Missing fields** (planned, not yet in schema):
- `direction` (inflow/outflow) — see [plans/cost-reductions.md](../plans/cost-reductions.md)
- `type` (expense/income/cost_reduction) — see [plans/cost-reductions.md](../plans/cost-reductions.md)
- `source` (manual/csv/bank_api/email/agent) — see [plans/csv-import.md](../plans/csv-import.md)
- `sourceRef` (external ID for dedup) — see [plans/deduplication.md](../plans/deduplication.md)
- `linkedExpenseId` (for cost reductions) — see [plans/cost-reductions.md](../plans/cost-reductions.md)
- `bankAccountId` — see [plans/csv-import.md](../plans/csv-import.md)

### Category

Hierarchical, per-wallet categories with color coding.

- `parentId`: nullable self-reference — `null` means root-level category
- `color`: hex string (default: `'#6B7280'`)
- `sortOrder`: integer for display ordering
- Unique constraint: `(walletId, parentId, name)` — no duplicate names at the same level

**Why per-wallet, not global:** Different wallets serve different purposes. A couple's shared wallet needs different categories than an individual's personal wallet. Global categories would force a lowest-common-denominator set.

### Tag

Flat (no hierarchy), per-wallet labels for cross-cutting concerns.

- Unique constraint: `(walletId, name)`

**Why tags exist alongside categories:** A category answers "what type of expense is this?" (Food > Groceries). A tag answers cross-cutting questions like "is this for the children?" or "is this vacation spending?" An expense has exactly one category but zero or many tags.

### ExpenseTag

Join table. PK: `(expenseId, tagId)`. Cascade deletes from both sides.

### Rule

Per-wallet categorization rule with priority-based evaluation.

- `priority`: integer — lower = higher priority
- `conditions`: JSONB — see [architecture/api.md](api.md#rules) for schema
- `actions`: JSONB — see [architecture/api.md](api.md#rules) for schema
- `enabled`: boolean
- `createdById`: tracks who created the rule

**Evaluation logic** (in `lib/rules/engine.ts`):
1. Rules sorted by priority ascending
2. First matching rule wins for `category` and `type`
3. All matching rules accumulate `tags`
4. Returns: `{ category?, tags[], type?, matchedRules[] }`

**Why rules before AI:** Deterministic rules are free and predictable. AI categorization is expensive and best-effort. Rules handle the common cases; AI fills gaps. Over time, observed AI patterns can be converted to rules. See [architecture/ai-integration.md](ai-integration.md).

## Auth.js tables

These are standard Auth.js tables managed by `@auth/drizzle-adapter`. Do not modify their structure without checking Auth.js compatibility.

- **accounts**: OAuth provider links (not actively used — Credentials provider only)
- **sessions**: Session records (JWT strategy means these are rarely used)
- **verification_tokens**: Email verification tokens (not yet used)

## Indexes

| Table | Index | Purpose |
|---|---|---|
| expenses | `userId` | Filter expenses by user |
| expenses | `walletId` | Filter expenses by wallet |
| expenses | `date` | Sort/filter by date |
| categories | `walletId` | List categories per wallet |
| tags | `walletId` | List tags per wallet |
| rules | `walletId` | List rules per wallet |
| rules | `(walletId, priority)` | Ordered rule evaluation |

## Migrations

Location: `drizzle/` — managed by Drizzle Kit.

Migrations run at container startup: `npx drizzle-kit migrate` (see Dockerfile CMD).

Current migrations:
1. `0000` — Auth schema + expenses (per-user, pre-wallet)
2. `0001` — User language & currency preferences
3. `0002` — Wallets, wallet_members, expenses.walletId
4. `0003` — Categories, tags, expense_tags, rules
