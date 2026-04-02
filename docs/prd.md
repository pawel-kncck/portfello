# Portfello — Product Requirements Document

## Overview

Portfello is an expense tracking web application built around **Spaces** — shared or personal containers for expenses. Users sign up, organize expenses into spaces, and visualize spending patterns through a dashboard and analytics page. Spaces allow couples, families, or roommates to track shared finances together while keeping personal expenses separate.

---

## Target User

Individuals and households who want to track expenses across personal and shared accounts. The first users are a couple who share some bank accounts but also have individual ones — the app must handle both seamlessly.

---

## Core Features

### 1. Authentication

| Flow | Details |
|------|---------|
| **Signup** | Name (1-100 chars), email (unique), password (min 8 chars), confirm password |
| **Login** | Email + password, redirects to `/dashboard` |
| **Logout** | Ends session, redirects to `/login` |
| **Session** | JWT-based (NextAuth v5), persists across page reloads |
| **Auto-login** | After successful signup, user is logged in automatically |

**Protected routes:** `/dashboard`, `/analytics`, `/api/**` (except health)
**Public routes:** `/login`, `/signup`

### 2. Spaces

A Space is the core organizational unit. It owns expenses, categories, and bank accounts. All members of a space see everything in it.

#### Types

| Type | Created | Sharing | Purpose |
|------|---------|---------|---------|
| **Personal** | Automatically on signup | Cannot be shared | User's own expenses |
| **Shared** | Manually by any user | Invite others by email | Joint accounts, household expenses |

#### Membership

| Role | Can view expenses | Can add/edit/delete expenses | Can manage categories | Can manage bank accounts | Can invite/remove members | Can delete space |
|------|---|---|---|---|---|---|
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Member** | Yes | Yes | Yes | Yes | No | No |

- A personal space has exactly one member (the owner). It cannot be converted to shared.
- A shared space has one owner (the creator) and one or more members.
- Removing a member does not delete their previously created expenses — expenses belong to the space.
- Every user sees a list of all spaces they belong to and can switch between them.

#### Categories

Categories are **per-space**, not global or per-user. Categories are **hierarchical** — each category can have subcategories to any depth.

```
Food
  ├─ Groceries
  ├─ Restaurants
  └─ Takeout
Shopping
  ├─ Clothing
  ├─ Electronics
  └─ E-commerce
Children
  ├─ Daycare
  ├─ Clothing
  └─ Activities
```

- Each new space starts with a default category tree (configurable)
- Members can add, rename, reparent, or delete categories within a space
- Changing a category name or color updates it for all members and all existing expenses in that space
- Deleting a category requires reassigning its expenses to another category
- Analytics can roll up to any level of the hierarchy (e.g., all "Food" or just "Food > Groceries")

#### Tags

Tags provide a **cross-cutting dimension** alongside the category hierarchy. An expense has exactly one category but can have zero or many tags.

- Tags are per-space, like categories
- Tags are flat (no hierarchy) — keep them simple
- Examples: `children`, `vacation`, `work`, `recurring`, `gift`
- Tags can be applied manually, by categorization rules, or by AI
- Analytics can filter and group by tag, enabling questions like "how much do we spend on our children across all categories?"

#### Bank Accounts

A bank account is linked to exactly one space. This association is what drives CSV import routing.

| Field | Rules |
|-------|-------|
| `name` | Required (e.g., "Joint Checking", "Pawel's Savings") |
| `accountNumber` | Required, unique across all spaces |
| `bankName` | Optional |

- Any space member can add or remove bank accounts
- An account number cannot belong to two spaces simultaneously

### 3. Expense Management

Each expense belongs to a space. All members of that space can view, edit, and delete it.

| Field | Type | Rules |
|-------|------|-------|
| `amount` | Decimal(10,2) | Required, always positive |
| `direction` | Enum | `outflow` (money out) or `inflow` (money in) |
| `type` | Enum | `expense`, `income`, or `cost_reduction` |
| `category` | Reference | Required, must be a category in the same space |
| `tags` | Reference[] | Zero or more tags from the same space |
| `date` | Date | Required, defaults to today |
| `description` | String | Optional, max 500 chars |
| `createdBy` | Reference | Auto-set to current user |
| `bankAccount` | Reference | Optional, set when imported from CSV or bank API |
| `linkedExpense` | Reference | Optional, for cost reductions — points to the original expense |
| `source` | Enum | `manual`, `csv`, `bank_api`, `email`, `agent` |
| `sourceRef` | String | Optional, external ID for deduplication |
| `documents` | Document[] | Attached receipts, invoices, etc. |

**Operations:**
- **Add** — modal dialog from dashboard, server-validated with Zod
- **Edit** — modal dialog, same validation
- **Delete** — single-click
- **List** — recent 10 on dashboard, all on analytics (with time filter)

Access control is at the space level: if you're a member, you can do everything. No per-expense ownership restrictions.

#### Cost Reductions (Returns)

Most expense trackers classify all incoming money as income. This inflates actual income figures when the inflow is really a return or refund.

In Portfello, an inflow can be classified as a **cost reduction** instead of income:
- The cost reduction links to the original expense via `linkedExpense`
- In analytics, the return amount subtracts from the original expense's category total — not added to income
- Example: Buy a jacket for 400 PLN (expense, category: Shopping > Clothing). Return it, get 400 PLN back. Net effect on Shopping > Clothing: 0 PLN. Income: unchanged.
- Linking is optional — a cost reduction without a linked expense still subtracts from its own category rather than inflating income

### 4. Categorization Rules

A per-space rule engine that deterministically categorizes, tags, and classifies expenses. Rules are cheaper and more predictable than AI — they run first, and AI fills in what rules don't cover.

#### Rule Format

Rules are defined as a JSON array, ordered by priority (first match for category wins; all matching rules apply for tags).

```json
[
  {
    "name": "Allegro purchases",
    "conditions": {
      "description": { "contains": "allegro" }
    },
    "actions": {
      "category": "Shopping > E-commerce",
      "tags": ["online"]
    }
  },
  {
    "name": "Children's clothing stores",
    "conditions": {
      "description": { "regex": "smyk|h&m kids|reserved kids" }
    },
    "actions": {
      "category": "Shopping > Clothing",
      "tags": ["children"]
    }
  },
  {
    "name": "Refunds under 500 PLN",
    "conditions": {
      "direction": { "equals": "inflow" },
      "amount": { "lte": 500 },
      "description": { "contains": "zwrot" }
    },
    "actions": {
      "type": "cost_reduction"
    }
  }
]
```

**Available conditions:**
- `description`: `contains`, `regex`, `startsWith`, `endsWith`
- `amount`: `equals`, `gt`, `gte`, `lt`, `lte`, `between`
- `direction`: `equals` (`inflow` | `outflow`)
- `bankAccount`: `equals` (account number)
- `date`: `dayOfWeek`, `between`

**Available actions:**
- `category`: set category (path notation: `"Parent > Child"`)
- `tags`: add tags (array)
- `type`: set type (`expense`, `income`, `cost_reduction`)

#### How Rules Are Managed

| Method | Audience | Capability |
|--------|----------|------------|
| **Simplified UI** | All users | Add/edit/delete rules with dropdowns and text inputs — covers common cases (description contains X → set category Y, add tag Z) |
| **JSON editor in UI** | Power users | Direct editing of the full JSON ruleset — access to all conditions and actions |
| **API** | AI agents, automation | Full CRUD on rules via REST — agents can learn patterns and create rules programmatically |

#### Evaluation Order

1. **Deterministic rules** run first (cheap, predictable)
2. **AI categorization** fills in any expense that rules didn't match (expensive, best-effort)
3. User can always override the result

### 5. CSV Import

Users can upload a CSV file containing bank transactions. The app parses it, routes transactions to the correct spaces based on account number, applies categorization rules, and deduplicates against existing data.

**Flow:**
1. User uploads a CSV (from any page or a dedicated import page)
2. App parses the file and groups transactions by account number
3. For each account number:
   - If it matches a known bank account → transactions are assigned to that bank account's space
   - If it does not match → user is prompted to either link it to an existing space or create a new one
4. Deduplication runs — flagged duplicates are highlighted for review
5. Categorization rules run, then AI fills gaps
6. User reviews the grouped transactions, confirms categories/tags, resolves duplicates, and imports

**CSV requirements:**
- Must contain at minimum: date, amount, account number
- Description/memo column is optional but mapped to expense description if present
- Category is auto-suggested by rules first, then AI, user can override before import

### 6. Email Ingestion & Document Matching

Receipts and invoices arrive via email. Portfello accepts forwarded emails, extracts documents, and matches them to existing expenses.

**Inbound email flow:**
1. Each space has a unique inbound email address (e.g., `space-abc123@in.portfello.lr15a.pl`)
2. User forwards a receipt or invoice email to this address (or sets up a Gmail/mail rule to auto-forward)
3. Portfello receives the email, extracts:
   - Attachments (PDF invoices, images)
   - Email body (order confirmations, receipts)
4. Embedded AI parses the document to extract: vendor, amount, date, line items
5. App attempts to **match** the document to an existing expense using amount + date + vendor similarity
6. If matched → document is attached to the expense, and the expense can be **recategorized** based on richer document data (e.g., generic "e-commerce" → "Electronics" based on invoice line items)
7. If no match → document is queued for manual review, or creates a new expense

**Example workflow:**
1. Buy something on Allegro, pay with Apple Pay
2. Bank transaction picked up → expense recorded as "Shopping > E-commerce" (via rules, based on vendor name "Allegro")
3. Allegro sends order confirmation email → user's Gmail rule auto-forwards to Portfello
4. Later, vendor sends invoice via Allegro → also forwarded
5. Both emails are matched to the original expense by amount + date
6. Invoice line items reveal it was electronics → expense recategorized to "Shopping > Electronics"
7. The expense now has two attached documents: order confirmation + invoice

**Document storage:**
- Documents stored as files (S3-compatible object storage or local filesystem)
- Metadata (vendor, extracted amount, matched expense) stored in the database
- Documents are per-space — all members can view them

### 7. Deduplication

The same transaction can arrive from up to four sources: CSV upload, bank API, manual entry, and AI agent. Two users in the same space can also upload overlapping CSVs. The app must detect and handle duplicates.

**Dedup strategy:**

| Signal | Weight | Notes |
|--------|--------|-------|
| `sourceRef` exact match | Definite duplicate | Same external transaction ID from bank |
| Amount + date + account | High confidence | Same amount on same date in same bank account |
| Amount + date (no account) | Medium confidence | Manual entries won't have an account number |
| Description similarity | Tiebreaker | Fuzzy match helps distinguish same-amount transactions on the same day |

**Behavior:**
- **On import (CSV, bank API, email):** dedup runs automatically before saving. Definite duplicates are silently skipped. High/medium confidence matches are flagged for user review.
- **On manual/agent entry:** if a likely duplicate exists, the user or agent is warned but can override.
- Each expense tracks its `source` and `sourceRef` to enable reliable matching.
- Merging: when a duplicate is confirmed, the richer record wins (e.g., keep the one with more metadata, merge documents from both).

### 8. Dashboard (`/dashboard`)

Everything on the dashboard is scoped to the **currently selected space**.

**Space switcher** in the sidebar — lists all spaces the user belongs to. Active space is highlighted.

**Summary cards** (3-column grid):

| Card | Value | Subtitle |
|------|-------|----------|
| This Month | Net spending (expenses minus cost reductions) | Transaction count |
| Total Expenses | Net spending across all time | Transaction count |
| Average | Net total / count | Per-transaction average |

**Recent expenses list:**
- Last 10 expenses, ordered by date descending
- Each row: amount, direction indicator, category badge (color-coded), tags, date, description
- Cost reductions shown with a visual indicator (e.g., green text, return icon)
- Inline edit/delete buttons per row
- Empty state when no expenses exist

### 9. Analytics (`/analytics`)

Scoped to the currently selected space.

**Time range filter:** All Time (default), This Year, This Month

**Summary cards** (same 3-column layout):
- Total Spent (net of cost reductions)
- Average Transaction
- Top Category (name + amount)

**Charts:**

| Chart | Type | Data |
|-------|------|------|
| Spending by Category | Pie chart | Expense totals grouped by category (supports hierarchy rollup), with percentages |
| Monthly Trends | Bar chart | Expense totals grouped by month |

Both charts respond to the time range filter. Tooltips show exact amounts on hover. Empty state shown when no data.

**Tag filtering:** analytics can be filtered by tag to answer questions like "how much do we spend on children across all categories?"

---

## Data Model

```
User
  id              UUID (pk)
  email           String (unique)
  name            String
  passwordHash    String
  createdAt       DateTime

Space
  id              UUID (pk)
  name            String
  type            'personal' | 'shared'
  inboundEmail    String (unique, auto-generated)
  createdAt       DateTime

SpaceMember
  id              UUID (pk)
  spaceId         UUID → Space
  userId          UUID → User
  role            'owner' | 'member'
  joinedAt        DateTime
  @@unique([spaceId, userId])

Category
  id              UUID (pk)
  spaceId         UUID → Space
  parentId        UUID? → Category (self-referential, null = root)
  name            String
  color           String (hex)
  sortOrder       Int
  @@unique([spaceId, parentId, name])

Tag
  id              UUID (pk)
  spaceId         UUID → Space
  name            String
  @@unique([spaceId, name])

BankAccount
  id              UUID (pk)
  spaceId         UUID → Space
  accountNumber   String (unique)
  name            String
  bankName        String?

Rule
  id              UUID (pk)
  spaceId         UUID → Space
  name            String
  priority        Int (lower = higher priority)
  conditions      JSON
  actions         JSON
  enabled         Boolean (default true)
  createdById     UUID → User
  createdAt       DateTime

Expense
  id              UUID (pk)
  spaceId         UUID → Space
  categoryId      UUID → Category
  createdById     UUID → User
  bankAccountId   UUID? → BankAccount
  linkedExpenseId UUID? → Expense (for cost reductions)
  amount          Decimal(10,2) (always positive)
  direction       'outflow' | 'inflow'
  type            'expense' | 'income' | 'cost_reduction'
  source          'manual' | 'csv' | 'bank_api' | 'email' | 'agent'
  sourceRef       String? (external ID for dedup)
  date            Date
  description     String?
  createdAt       DateTime
  updatedAt       DateTime?

ExpenseTag
  expenseId       UUID → Expense
  tagId           UUID → Tag
  @@unique([expenseId, tagId])

Document
  id              UUID (pk)
  expenseId       UUID? → Expense (null if unmatched)
  spaceId         UUID → Space
  fileName        String
  fileUrl          String (path or S3 URL)
  mimeType        String
  extractedData   JSON? (vendor, amount, date, line items — from AI)
  source          'email' | 'upload'
  inboundEmailId  UUID? → InboundEmail
  createdAt       DateTime

InboundEmail
  id              UUID (pk)
  spaceId         UUID → Space
  fromAddress     String
  subject         String
  receivedAt      DateTime
  processed       Boolean (default false)
```

---

## API

All endpoints require a valid session (or API token). Access is scoped to spaces the user is a member of.

**Spaces**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces` | List user's spaces |
| `POST` | `/api/spaces` | Create a shared space |
| `PUT` | `/api/spaces/[id]` | Update space name |
| `DELETE` | `/api/spaces/[id]` | Delete space (owner only) |
| `POST` | `/api/spaces/[id]/members` | Invite member by email |
| `DELETE` | `/api/spaces/[id]/members/[userId]` | Remove member (owner only) |

**Categories**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces/[id]/categories` | List category tree |
| `POST` | `/api/spaces/[id]/categories` | Add category (with optional parentId) |
| `PUT` | `/api/spaces/[id]/categories/[catId]` | Rename, recolor, or reparent |
| `DELETE` | `/api/spaces/[id]/categories/[catId]` | Delete (requires reassignment) |

**Tags**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces/[id]/tags` | List tags |
| `POST` | `/api/spaces/[id]/tags` | Create tag |
| `PUT` | `/api/spaces/[id]/tags/[tagId]` | Rename tag |
| `DELETE` | `/api/spaces/[id]/tags/[tagId]` | Delete tag (removed from all expenses) |

**Rules**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces/[id]/rules` | List rules (ordered by priority) |
| `POST` | `/api/spaces/[id]/rules` | Create rule |
| `PUT` | `/api/spaces/[id]/rules/[ruleId]` | Update rule |
| `DELETE` | `/api/spaces/[id]/rules/[ruleId]` | Delete rule |
| `PUT` | `/api/spaces/[id]/rules/reorder` | Reorder rule priorities |

**Bank Accounts**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces/[id]/bank-accounts` | List bank accounts |
| `POST` | `/api/spaces/[id]/bank-accounts` | Link bank account |
| `DELETE` | `/api/spaces/[id]/bank-accounts/[accId]` | Unlink bank account |

**Expenses**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/spaces/[id]/expenses` | List expenses (date desc, filterable by tag, category, type, date range) |
| `POST` | `/api/spaces/[id]/expenses` | Create expense (dedup check runs automatically) |
| `PUT` | `/api/spaces/[id]/expenses/[expId]` | Update expense |
| `DELETE` | `/api/spaces/[id]/expenses/[expId]` | Delete expense |

**Import & Documents**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/spaces/[id]/import/csv` | Upload CSV, returns grouped preview with dedup flags |
| `POST` | `/api/spaces/[id]/import/confirm` | Confirm and save imported transactions |
| `POST` | `/api/spaces/[id]/documents` | Upload document, attempt match to expense |
| `GET` | `/api/spaces/[id]/documents` | List documents (matched and unmatched) |
| `POST` | `/api/inbound-email` | Webhook for incoming email (internal, authenticated by secret) |

**Other**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check (no auth) |

---

## Validation

**Client-side:** required fields, password match, positive amount

**Server-side (Zod):**
- Email: valid format
- Password: min 8 characters
- Name: 1-100 characters
- Space name: 1-100 characters
- Amount: positive number
- Category name: 1-50 characters
- Account number: 1-34 characters (IBAN max)
- Date: YYYY-MM-DD
- Description: max 500 characters

Duplicate email on signup returns a generic error (no user enumeration).

---

## UI/UX

- **Layout:** fixed left sidebar (logo, space switcher, nav, user profile, logout) + scrollable main content
- **Space switcher:** dropdown or list in sidebar showing all user's spaces, with the active space highlighted
- **Responsive:** 3-column cards on desktop, single column on mobile
- **Category colors:** configurable per category, per space
- **Loading states:** skeleton placeholders in lists, spinners in buttons and analytics
- **Error handling:** form-level alerts (destructive variant), user-friendly messages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | NextAuth v5 (Credentials provider, JWT sessions) |
| UI | Radix UI primitives + Tailwind CSS |
| Charts | Recharts |
| Validation | Zod |
| Password hashing | bcryptjs (12 rounds) |
| Deployment | Docker on Coolify (Hetzner) |

---

## Security

- Passwords hashed with bcryptjs (12-round salt)
- JWT session strategy (no server-side session storage)
- Space membership checks on all data access and mutations
- HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy
- No secrets in codebase (env vars via Coolify dashboard)
- Non-root Docker user

---

## AI Integration

The app uses a two-layer AI architecture: an **API-first layer** that external agents consume, and **embedded AI** for specific in-app workflows. The API is the boundary between the two — external agents never touch the UI, and embedded AI never orchestrates across systems.

### Layer 1: API for External Agents

Any AI agent (Claude, custom, user's choice) can interact with Portfello as a tool/skill via the documented API.

**What this enables:**
- Natural language expense entry ("Spent 45 PLN on lunch") from any surface — terminal, phone, Slack, etc.
- Cross-system orchestration — an agent checks bank transactions and logs new ones in Portfello, without the app needing to know about bank APIs
- Conversational analysis — "Compare my food spending this month vs last month"
- Each user brings their own agent with their own preferences

**What Portfello provides:**
- OpenAPI spec auto-generated from route handlers, kept in sync with the codebase
- API token authentication (per-user, long-lived) as an alternative to session-based auth, so agents can authenticate without browser flows
- All features accessible through the API — no UI-only capabilities

**What Portfello does not do:**
- No agent hosting, orchestration, or LLM calls on behalf of external agents
- No opinion on which agent framework or LLM the user chooses

### Layer 2: Embedded AI (Targeted, Not Chat)

Server-side LLM calls during specific workflows where instant, context-aware suggestions improve the UX. These are not a chatbot or general-purpose agent — they are smart defaults at decision points.

**Relationship with deterministic rules:** Rules run first (cheap, predictable). AI only runs on expenses that rules didn't fully categorize. Over time, AI agents can observe their own categorization patterns and **create deterministic rules** via the API — converting expensive AI calls into free rule evaluations.

| Workflow | AI capability | Fallback if AI unavailable |
|----------|--------------|---------------------------|
| **CSV import** | Categorize + tag transactions that rules didn't match, based on description and the space's category tree + history | User manually selects category for each row |
| **Receipt/invoice parsing** | OCR document → extract vendor, amount, date, line items. Suggest category based on line items (e.g., invoice for electronics → "Shopping > Electronics") | User manually enters all fields |
| **Manual entry** | Suggest category + tags based on description text as user types | User selects from dropdown |
| **Document matching** | Match incoming documents to existing expenses using amount + date + vendor similarity | User manually links document to expense |
| **Rule suggestion** | After repeated AI categorizations, suggest "create a rule for this?" | User creates rules manually |

**Design principles:**
- AI suggestions are always overridable — the user confirms before anything is saved
- Embedded AI uses the space's own category tree, tags, rules, and historical patterns — not generic labels
- LLM calls happen server-side (API route), never client-side
- Graceful degradation — every AI-assisted workflow works fully without AI, just with more manual input

```
External AI Agents
(user's choice — Claude, custom, etc.)
         │
         │ HTTP + API token
         ▼
┌──────────────────────────────────────┐
│  Portfello API                       │
│  OpenAPI-documented, complete        │
│  ← foundation for everything         │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Portfello App (UI + Server)         │
│                                      │
│  1. Deterministic rules (free, fast) │
│  2. Embedded AI (fills gaps)         │
│  3. User confirms / overrides        │
│                                      │
│  AI workflows:                       │
│  • CSV import: categorize leftovers  │
│  • Email ingestion: parse + match    │
│  • Inline suggestions                │
│  • Rule creation suggestions         │
└──────────────────────────────────────┘
```

---

## Future

Planned but not in the initial build:

- **Mobile app** — native iOS/Android app. The API-first architecture is designed with this in mind. The web app establishes the feature set; the mobile app consumes the same API.
- **Bank API integration** (Plaid, GoCardless, etc.) — automated transaction import. Currently handled by CSV upload and email ingestion.

---

## Out of Scope

These are explicitly **not** planned:

- Recurring expense detection / scheduling
- Budget goals or limits
- CSV/PDF export
- Currency conversion
- Email verification
- Password reset
- OAuth providers (Google, GitHub, etc.)
- In-app chatbot or general-purpose conversational agent
