# Hosting Architecture for Multi-App Portfolio

## Overview

This document describes the target hosting architecture for a portfolio of 10-20 web applications (mostly Next.js), a few AI agent workloads, and their shared infrastructure. The goal is to minimize hosting costs while maintaining reliability for the few production-grade apps.

## Context and Constraints

### Current State

- **Serious apps:** Filbert (KSeF invoice viewer for Polish market) and Reminto (KSeF invoice attribution via IDWew identifiers) — both built on Next.js + Supabase (PostgreSQL with pgvector, RLS).
- **Hobby apps:** 10-20 simple web apps, most half-finished, zero or few users. All need a database and auth. Some need file storage.
- **AI agents:** Autonomous coding agents (Open Claw style) running on separate VPSes or Mac Minis. These are intentionally isolated and out of scope for this architecture.
- **Existing infra:** Several Hetzner VPSes, Docker Compose + Caddy reverse proxy, Forgejo for version control.

### Problem

Supabase Cloud charges €10/project beyond the 2 free-tier projects. Hosting 10-20 apps on Supabase would cost €100-180/month, which is unsustainable for mostly-hobby projects.

### Requirements

- Every app needs PostgreSQL and authentication.
- Some apps need file storage.
- Serious apps (Filbert, Reminto) need high reliability, pgvector, and RLS.
- Hobby apps should be as cheap as possible to host.
- The architecture should minimize operational overhead while keeping costs low.

## Architecture Decision: Tiered Hosting

### Tier 1 — Serious Apps → Supabase Cloud

**Apps:** Filbert, Reminto (and any future production-grade app).

**Rationale:** These apps use Supabase deeply — pgvector for RAG, RLS for security, the Supabase client SDK, auth, and realtime features. The €10/month per project buys managed backups, connection pooling (Supavisor), dashboard, and zero operational overhead. Migrating away would mean re-implementing significant functionality.

**Action:** Use the 2 free-tier Supabase projects for these. If a third serious app emerges, the €10/month is justified.

### Tier 2 — Hobby Apps → Self-Hosted on Hetzner

**Apps:** Everything else (10-20 hobby/side-project apps).

**Rationale:** These apps don't use Supabase's advanced features enough to justify €10/month each. A shared self-hosted PostgreSQL instance with Auth.js handles 90% of what's needed at a fraction of the cost.

## Tier 2 Architecture: Self-Hosted Stack

### Compute/Data Separation

The self-hosted infrastructure is split across two Hetzner VPSes:

```
App Server (CX22 ~€4/mo)             DB Server (CX22 ~€4/mo)
┌──────────────────────────┐          ┌──────────────────────────┐
│  Caddy (reverse proxy)   │          │  PostgreSQL 16           │
│  app-1 (Next.js)         │◄────────►│    ├─ app_1_db           │
│  app-2 (Next.js)         │ Hetzner  │    ├─ app_2_db           │
│  app-3 (Flask/other)     │ private  │    ├─ app_3_db           │
│  ...                     │ network  │    ├─ ...                │
│  Docker Compose          │          │    └─ app_N_db           │
└──────────────────────────┘          └──────────────────────────┘
                                        │
                                        ▼ cron: pg_dumpall
                                      Hetzner Storage Box (~€3/mo)
```

**Why separate servers instead of one box:**

1. **Independent scaling.** App server and DB server have different resource profiles. Apps need CPU for SSR; the database needs RAM and disk I/O. Upgrading one doesn't force upgrading the other.
2. **Safer maintenance.** Restarting or rebuilding the app server (e.g., Docker Compose restart) causes zero database downtime. On a shared box, a Compose restart that includes PostgreSQL drops connections across all apps.
3. **Cleaner failure isolation.** A runaway app container can't OOM-kill PostgreSQL. The DB server has a single, focused job.
4. **Security boundary.** The DB server has no public ports. It only accepts connections from the app server's private IP.

### Database Strategy: One Server, Many Databases

**Decision:** Run a single PostgreSQL 16 process with a separate database per app (`CREATE DATABASE app_name;`).

**Why not one database per app (separate PostgreSQL instances):**

- Each PostgreSQL process idles at ~30-50MB RAM. With 15 instances, that's 500-750MB wasted.
- N config files, N backup schedules, N port mappings to manage.

**Why not one shared database with schemas/prefixes:**

- Migrations can collide.
- One bad migration can break everything.
- Hard to cleanly drop an abandoned app's data.

**Why one server with separate databases (chosen approach):**

- Single process to monitor, tune, and back up.
- Full isolation: each app has its own tables, migrations, and connection string.
- Dropping an app is just `DROP DATABASE app_name;`.
- Memory is shared efficiently via PostgreSQL's `shared_buffers`.
- Each app gets its own DB user for additional security isolation.

**Connection string pattern per app:**

```
postgresql://app_name_user:password@<db-private-ip>:5432/app_name_db
```

### Authentication Strategy: Auth.js (NextAuth)

**Decision:** Use Auth.js (formerly NextAuth) for authentication in all Tier 2 apps.

**Rationale:** Since the apps are mostly Next.js, Auth.js is the natural fit. It supports OAuth (Google, GitHub, etc.), email/password, and magic links. Auth tables live in each app's own database. Combined with Drizzle or Prisma for the ORM, this gives a standard, well-documented stack.

**Alternative considered — PocketBase:** A single Go binary with built-in auth, file storage, and admin UI. Very lightweight. Rejected because it uses SQLite (leaving the PostgreSQL ecosystem) and fragments the stack.

**Alternative considered — Self-hosted Supabase:** Keeps the familiar SDK, but self-hosted Supabase is heavy (~2GB RAM for platform services) and isn't designed for multi-project use. Would require awkward schema-based multi-tenancy.

**TODO:** Create a Next.js app template/boilerplate with Auth.js + Drizzle + PostgreSQL pre-wired, so each new hobby app starts with auth and DB already configured.

### Networking

- Both VPSes must be in the **same Hetzner datacenter** (e.g., Falkenstein, Nuremberg, or Helsinki).
- Use **Hetzner Cloud Networks** (private networking): free, 10Gbit, no bandwidth charges.
- Expected latency between servers on private network: **~0.1-0.3ms** (negligible).
- The DB server should have **no public IP** or at minimum no publicly exposed PostgreSQL port. All DB traffic goes over the private network.

### Reverse Proxy: Caddy

Continue using Caddy on the app server as the reverse proxy. Each app gets a subdomain or domain routed to its Docker container. Caddy handles TLS automatically via Let's Encrypt.

### Backups

- Run a `pg_dumpall` cron job on the DB server (e.g., nightly).
- Push dumps to a **Hetzner Storage Box** (~€3/month for 1TB).
- Retain at least 7 daily backups and 4 weekly backups.
- Periodically test restores.

### File Storage (where needed)

For hobby apps that need file storage, options to evaluate:

- **Local disk + Caddy static serving:** Simplest. Store files on the app server, serve via Caddy. No external dependency.
- **Hetzner Storage Box via SFTP/SMB:** Cheap, durable, off-server.
- **MinIO (self-hosted S3-compatible):** If S3 API compatibility is needed. Heavier to run.

Decision deferred — evaluate per app based on actual needs.

## Cost Summary

| Component               | Monthly Cost |
| ----------------------- | ------------ |
| App Server (CX22)       | ~€4          |
| DB Server (CX22)        | ~€4          |
| Hetzner Storage Box     | ~€3          |
| Supabase Cloud (Tier 1) | €0-10        |
| **Total**               | **~€11-21**  |

Compared to hosting 10-20 apps on Supabase Cloud: **€100-180/month**.

## Scaling Considerations

- **App server RAM:** 15 simultaneous Next.js containers will use significant RAM. A CX22 (4GB) may not be enough. Options: upgrade to CX32 (8GB, ~€8/mo), or keep some apps cold (not running until accessed). Evaluate once apps are deployed.
- **DB server:** A CX22 is more than sufficient for 15-20 low-traffic databases. PostgreSQL with `shared_buffers` set to ~1GB can handle this easily.
- **If a hobby app graduates to production:** Move it to Supabase Cloud (Tier 1) or give it dedicated resources.

## Open Questions / TODOs

- [ ] Create a Next.js + Auth.js + Drizzle + PostgreSQL boilerplate template.
- [ ] Decide on Hetzner datacenter location for both servers.
- [ ] Set up Hetzner Cloud Network between the two VPSes.
- [ ] Configure PostgreSQL for multi-database use (connection limits, shared_buffers tuning, per-app users).
- [ ] Set up automated backup pipeline (pg_dumpall → Storage Box).
- [ ] Evaluate whether CX22 is sufficient for the app server or if CX32 is needed.
- [ ] Decide on file storage strategy per app.
- [ ] Plan migration path for existing hobby apps currently on Supabase.
