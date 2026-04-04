# API Reference

> Source of truth: route handlers in `app/api/`. If this document conflicts with the code, the code wins.

All endpoints require a valid Auth.js session (JWT) unless noted. Access is scoped to wallets the user is a member of. Auth is enforced per-route via `auth()` calls — there is no global middleware.

## Common patterns

- **401**: Missing or invalid session
- **403**: Insufficient role (e.g., non-owner trying to invite)
- **404**: Resource not found or user lacks wallet membership
- **400**: Zod validation failure or business logic violation
- **409**: Duplicate entry (e.g., tag name already exists in wallet)
- All validation errors return the first Zod error message

## Health

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | Returns `{ "status": "ok" }` |

## Wallets

> Data model: [data-model.md#wallet](data-model.md#wallet)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets` | List user's wallets with role |
| POST | `/api/wallets` | Create shared wallet (caller becomes owner) |
| PUT | `/api/wallets/[id]` | Update wallet name |
| DELETE | `/api/wallets/[id]` | Delete wallet (owner only, not personal) |

**POST /api/wallets** request:
```json
{ "name": "string (1-100 chars)" }
```

**GET /api/wallets** response:
```json
{
  "wallets": [{
    "id": "uuid",
    "name": "string",
    "type": "shared | personal",
    "role": "owner | member",
    "createdAt": "datetime",
    "joinedAt": "datetime"
  }]
}
```

## Wallet Members

> Data model: [data-model.md#walletmember](data-model.md#walletmember)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets/[id]/members` | List members with user details |
| POST | `/api/wallets/[id]/members` | Invite by email (owner only, shared wallets only) |
| DELETE | `/api/wallets/[id]/members/[userId]` | Remove member (owner only, cannot remove self) |

**POST /api/wallets/[id]/members** request:
```json
{ "email": "valid-email@example.com" }
```

Note: invitee must already have an account. Returns 404 if user not found, 409 if already a member.

## Expenses

> Data model: [data-model.md#expense](data-model.md#expense)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/expenses?walletId=...` | List expenses (date desc). Optional walletId filter |
| POST | `/api/expenses` | Create expense (membership check on walletId) |
| PUT | `/api/expenses/[id]` | Update expense |
| DELETE | `/api/expenses/[id]` | Delete expense |

**POST /api/expenses** request:
```json
{
  "amount": 45.99,
  "category": "Food",
  "date": "2026-04-04",
  "description": "optional, max 500 chars",
  "walletId": "uuid (required)"
}
```

**GET response** shape:
```json
{
  "expenses": [{
    "id": "uuid",
    "walletId": "uuid",
    "amount": 45.99,
    "category": "Food",
    "date": "2026-04-04",
    "description": "string | null",
    "createdAt": "datetime",
    "updatedAt": "datetime | null"
  }]
}
```

**Access control:** wallet membership check. Legacy expenses (no walletId) fall back to userId ownership check.

**Not yet implemented:** filtering by tag, category, type, or date range on the GET endpoint.

## Categories

> Data model: [data-model.md#category](data-model.md#category)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets/[id]/categories` | List as tree + flat array |
| POST | `/api/wallets/[id]/categories` | Create (with optional parentId) |
| PUT | `/api/wallets/[id]/categories/[catId]` | Update name, color, parentId, sortOrder |
| DELETE | `/api/wallets/[id]/categories/[catId]` | Delete (children require `?reassignTo=` param) |

**POST request:**
```json
{
  "name": "string (1-100 chars)",
  "parentId": "uuid | null",
  "color": "#RRGGBB (optional)",
  "sortOrder": 0
}
```

**GET response** includes both tree and flat representations:
```json
{
  "categories": [{ "id": "...", "name": "...", "children": [...] }],
  "flat": [{ "id": "...", "name": "...", "parentId": "..." }]
}
```

**DELETE behavior:** if the category has children, you must pass `?reassignTo=<categoryId>` or `?reassignTo=root` to reparent them.

**Validation:** category cannot be its own parent. Name must be unique at the same level (walletId + parentId + name).

## Tags

> Data model: [data-model.md#tag](data-model.md#tag)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets/[id]/tags` | List tags (ordered by name) |
| POST | `/api/wallets/[id]/tags` | Create tag |
| PUT | `/api/wallets/[id]/tags/[tagId]` | Rename tag |
| DELETE | `/api/wallets/[id]/tags/[tagId]` | Delete tag (cascades from expense_tags) |

**POST/PUT request:**
```json
{ "name": "string (1-50 chars)" }
```

Returns 409 if name already exists in the wallet.

## Rules

> Data model: [data-model.md#rule](data-model.md#rule)
> Evaluation engine: `lib/rules/engine.ts`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets/[id]/rules` | List rules (ordered by priority asc) |
| POST | `/api/wallets/[id]/rules` | Create rule |
| PUT | `/api/wallets/[id]/rules/[ruleId]` | Update rule |
| DELETE | `/api/wallets/[id]/rules/[ruleId]` | Delete rule |
| PUT | `/api/wallets/[id]/rules/reorder` | Reorder by priority |

**POST request:**
```json
{
  "name": "string (1-200 chars)",
  "priority": 0,
  "conditions": {
    "description": { "contains": "allegro" },
    "amount": { "gte": 100, "lte": 500 },
    "direction": { "equals": "inflow" },
    "bankAccount": { "equals": "PL12345" },
    "date": { "dayOfWeek": 5 }
  },
  "actions": {
    "category": "Shopping > E-commerce",
    "tags": ["online"],
    "type": "expense"
  },
  "enabled": true
}
```

**Condition operators:**
- `description`: `contains`, `regex`, `startsWith`, `endsWith` (case-insensitive)
- `amount`: `equals`, `gt`, `gte`, `lt`, `lte`, `between` ([min, max])
- `direction`: `equals` (`"inflow"` | `"outflow"`)
- `bankAccount`: `equals`
- `date`: `dayOfWeek` (0-6), `between` ([start, end])

**Action fields:**
- `category`: string (path notation `"Parent > Child"`)
- `tags`: string array
- `type`: `"expense"` | `"income"` | `"cost_reduction"`

At least one condition and one action required.

**PUT /api/wallets/[id]/rules/reorder** request:
```json
{ "ruleIds": ["uuid1", "uuid2", "uuid3"] }
```
Sets priority based on array position (0, 1, 2...).

## User Settings

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/settings` | Get language & currency |
| PUT | `/api/settings` | Update language & currency |

**PUT request:**
```json
{
  "language": "pl | en",
  "currency": "PLN | USD"
}
```
