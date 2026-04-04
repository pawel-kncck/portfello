# Roadmap

> This document tracks planned features that are **not yet implemented**. When a feature ships, remove it from here.

## Planned features

### Phase 1: Core expense model evolution

These changes extend the existing expense model to support richer transaction types.

| Feature | Plan | Dependency | Schema changes |
|---|---|---|---|
| Cost reductions | [cost-reductions.md](cost-reductions.md) | None | Add `direction`, `type`, `linkedExpenseId`, `categoryId` to expenses |
| Bank accounts | Part of [csv-import.md](csv-import.md) | None | New `bank_accounts` table, add `bankAccountId` to expenses |

### Phase 2: Import & ingestion

Automated ways to get transactions into the system.

| Feature | Plan | Dependency | Schema changes |
|---|---|---|---|
| CSV import | [csv-import.md](csv-import.md) | Bank accounts, cost reductions | Add `source`, `sourceRef` to expenses |
| Email ingestion | [email-ingestion.md](email-ingestion.md) | Document management | New `inbound_emails` table, `inboundEmail` on wallets |
| Deduplication | [deduplication.md](deduplication.md) | CSV import | Uses `sourceRef` + amount/date matching |

### Phase 3: Documents & AI

| Feature | Plan | Dependency |
|---|---|---|
| Document management | [document-management.md](document-management.md) | None (can start independently) |
| AI categorization | See [architecture/ai-integration.md](../architecture/ai-integration.md) | Rules engine (exists), CSV import |

### Phase 4: Platform expansion

| Feature | Plan | Dependency |
|---|---|---|
| API token auth | Needed for external agents | None |
| OpenAPI spec | Auto-generated from routes | None |
| Mobile app | [mobile-app.md](mobile-app.md) | API token auth |

## Out of scope

Explicitly **not** planned:

- Recurring expense detection / scheduling
- Budget goals or limits
- CSV/PDF export
- Currency conversion
- Email verification / password reset
- OAuth providers (Google, GitHub)
- In-app chatbot
