# Plan: Deduplication

> **Status: Not implemented.** Depends on CSV import (source/sourceRef fields).

## Problem

The same transaction can arrive from multiple sources: CSV upload, bank API, manual entry, AI agent. Two users in the same wallet can upload overlapping CSVs.

## Strategy

| Signal | Confidence | Notes |
|---|---|---|
| `sourceRef` exact match | Definite duplicate | Same external transaction ID from bank |
| Amount + date + account | High | Same amount on same date in same bank account |
| Amount + date (no account) | Medium | Manual entries won't have account number |
| Description similarity | Tiebreaker | Fuzzy match helps distinguish same-amount same-day transactions |

## Behavior

- **On import (CSV, bank API, email):** dedup runs before saving. Definite duplicates silently skipped. High/medium confidence flagged for user review.
- **On manual/agent entry:** if likely duplicate exists, user or agent is warned but can override.
- **Merging:** when duplicate confirmed, the richer record wins (more metadata). Documents merged from both.

## Dependencies

- `source` and `sourceRef` fields on expenses (from [csv-import.md](csv-import.md))
- Bank account linking (for account-based matching)
