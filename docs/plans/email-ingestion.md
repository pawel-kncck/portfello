# Plan: Email Ingestion & Document Matching

> **Status: Not implemented.** Depends on document management.

## Overview

Receipts and invoices arrive via email. Portfello accepts forwarded emails, extracts documents, and matches them to existing expenses.

## Flow

1. Each wallet gets a unique inbound email address (e.g., `wallet-abc123@in.portfello.lr15a.pl`)
2. User forwards receipt/invoice email (or sets up Gmail auto-forward rule)
3. Portfello receives email, extracts attachments and body
4. AI parses document: vendor, amount, date, line items
5. App attempts to match to existing expense (amount + date + vendor similarity)
6. If matched: document attached, expense optionally recategorized based on richer data
7. If no match: queued for manual review or creates new expense

## Schema changes needed

### Wallet addition

- `inboundEmail`: unique string on wallets table

### New `inbound_emails` table

| Field | Type |
|---|---|
| `id` | UUID PK |
| `walletId` | FK to wallets |
| `fromAddress` | string |
| `subject` | string |
| `receivedAt` | datetime |
| `processed` | boolean (default false) |

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/inbound-email` | Webhook for incoming email (internal, secret-authenticated) |

## Example workflow

1. Buy on Allegro, pay with Apple Pay
2. Bank transaction imported -> expense: "Shopping > E-commerce" (via rules)
3. Allegro sends order confirmation -> auto-forwarded to Portfello
4. Vendor sends invoice -> also forwarded
5. Both matched to original expense by amount + date
6. Invoice line items -> recategorize to "Shopping > Electronics"
7. Expense now has two attached documents
