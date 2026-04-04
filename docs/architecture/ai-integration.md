# AI Integration Design

> **Status: Design only — not yet implemented.** This document describes the planned AI architecture. No LLM calls, API token auth, or AI-assisted workflows exist in the codebase today.

## Two-layer architecture

```
External AI Agents                    Layer 1: API for agents
(user's choice)                       (planned: API token auth)
         │
         │ HTTP + API token
         ▼
┌──────────────────────────────────────┐
│  Portfello API                       │
│  (exists today — session auth only)  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Portfello App                       │
│                                      │  Layer 2: Embedded AI
│  1. Deterministic rules (exists)     │  (planned)
│  2. Embedded AI (fills gaps)         │
│  3. User confirms / overrides        │
└──────────────────────────────────────┘
```

### Layer 1: API for external agents

Any AI agent (Claude, custom, etc.) interacts with Portfello via the REST API. The app doesn't host agents or make LLM calls on their behalf.

**What this enables:**
- Natural language expense entry from any surface (terminal, phone, Slack)
- Cross-system orchestration (agent checks bank, logs expenses in Portfello)
- Conversational analytics ("compare food spending this month vs last")

**What's needed to enable this:**
- API token authentication (per-user, long-lived) as alternative to session auth
- OpenAPI spec auto-generated from route handlers

### Layer 2: Embedded AI (targeted, not chat)

Server-side LLM calls during specific workflows. Not a chatbot — smart defaults at decision points.

**Relationship with rules:** Rules run first (free, predictable). AI only runs on expenses that rules didn't fully categorize. Over time, AI patterns can be converted to rules via the API.

| Workflow | AI capability | Fallback without AI |
|---|---|---|
| CSV import | Categorize transactions rules didn't match | User manually selects category |
| Receipt/invoice parsing | OCR + extract vendor, amount, date | User enters all fields manually |
| Manual entry | Suggest category + tags as user types | User selects from dropdown |
| Document matching | Match documents to expenses by amount + date + vendor | User manually links |
| Rule suggestion | After repeated AI categorizations, suggest "create a rule?" | User creates rules manually |

**Design principles:**
- AI suggestions are always overridable — user confirms before save
- Embedded AI uses the wallet's own category tree, tags, rules, and history
- LLM calls happen server-side (API routes), never client-side
- Graceful degradation — every workflow works fully without AI

## What exists today

Only the deterministic rule engine (`lib/rules/engine.ts`) is implemented. It evaluates conditions and applies actions (category, tags, type) based on priority order. See [api.md#rules](api.md#rules) for the full rule schema.

## Dependencies on other planned features

- CSV import ([plans/csv-import.md](../plans/csv-import.md)) — primary consumer of AI categorization
- Email ingestion ([plans/email-ingestion.md](../plans/email-ingestion.md)) — needs document parsing
- Document management ([plans/document-management.md](../plans/document-management.md)) — needs OCR + matching
