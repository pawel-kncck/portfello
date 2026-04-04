# Plan: Document Management

> **Status: Not implemented.** Can start independently of other features.

## Overview

Attach receipts, invoices, and other documents to expenses. Documents can arrive via email ingestion or direct upload.

## Schema changes needed

### New `documents` table

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID PK | |
| `expenseId` | FK to expenses (nullable) | Null if unmatched |
| `walletId` | FK to wallets | Required |
| `fileName` | string | Original filename |
| `fileUrl` | string | Storage path (S3 URL or local path) |
| `mimeType` | string | e.g., `application/pdf`, `image/jpeg` |
| `extractedData` | JSONB (nullable) | AI-extracted: vendor, amount, date, line items |
| `source` | enum: `email`, `upload` | How it arrived |
| `inboundEmailId` | FK to inbound_emails (nullable) | Link to source email |
| `createdAt` | datetime | |

## Storage

- S3-compatible object storage or local filesystem
- Metadata in database, files in storage
- Documents are per-wallet — all members can view

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/wallets/[id]/documents` | Upload document, attempt match |
| GET | `/api/wallets/[id]/documents` | List documents (matched and unmatched) |
