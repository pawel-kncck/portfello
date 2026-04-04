# Plan: CSV Import

> **Status: Not implemented.** Depends on bank accounts table and cost reductions.

## Overview

Users upload a CSV from their bank. The app parses it, routes transactions to wallets by account number, applies categorization rules, deduplicates, and lets the user review before importing.

## Flow

1. User uploads CSV
2. App parses and groups transactions by account number
3. For each account number:
   - Known account -> route to that account's wallet
   - Unknown account -> prompt user to link or create wallet
4. Deduplication runs (see [deduplication.md](deduplication.md))
5. Categorization rules run, then AI fills gaps (see [ai-integration.md](../architecture/ai-integration.md))
6. User reviews, confirms categories/tags, resolves duplicates, imports

## Schema changes needed

### New `bank_accounts` table

| Field | Type | Rules |
|---|---|---|
| `id` | UUID PK | |
| `walletId` | FK to wallets | Required |
| `accountNumber` | string, unique | Required (e.g., IBAN) |
| `name` | string | Required (e.g., "Joint Checking") |
| `bankName` | string | Optional |

### Expense additions

| Field | Type | Purpose |
|---|---|---|
| `bankAccountId` | FK to bank_accounts (nullable) | Set when imported from CSV |
| `source` | enum: `manual`, `csv`, `bank_api`, `email`, `agent` | How the expense was created |
| `sourceRef` | string (nullable) | External transaction ID for dedup |

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallets/[id]/bank-accounts` | List bank accounts |
| POST | `/api/wallets/[id]/bank-accounts` | Link bank account |
| DELETE | `/api/wallets/[id]/bank-accounts/[accId]` | Unlink bank account |
| POST | `/api/wallets/[id]/import/csv` | Upload CSV, returns grouped preview with dedup flags |
| POST | `/api/wallets/[id]/import/confirm` | Confirm and save imported transactions |

## CSV requirements

- Must contain at minimum: date, amount, account number
- Description column optional but maps to expense description
- Category auto-suggested by rules first, then AI, user can override
