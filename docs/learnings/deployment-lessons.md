# Deployment Lessons Learned

A record of deployment issues encountered during the initial Portfello deployment to Coolify, what caused each one, and how it was resolved.

> **Historical note:** The app was originally deployed with Prisma 7 as the ORM and later migrated to Drizzle ORM. Issues 3-5 are Prisma-specific and documented for historical context. The general lessons (Issues 1, 2, 6, 7) still apply.

---

## Context

- **App**: Next.js 16 with Docker on Coolify (Hetzner CX22, 4GB RAM)
- **Database**: PostgreSQL 16 on a separate Hetzner server, connected via private network
- **Date**: 2026-04-02
- **ORM at time of deployment**: Prisma 7 (since migrated to Drizzle ORM)

---

## Issue 1: `npm ci` fails — lockfile out of sync

**Error:**
```
npm ci can only install packages when your package.json and package-lock.json
are in sync. Missing: @emnapi/runtime@1.9.1 from lock file
```

**Root cause:** Lockfile generated with npm 11 (Node 24) locally, but different npm versions resolve optional platform-specific dependencies differently.

**Solution:** Use `npm install` instead of `npm ci` in the Dockerfile. With a lockfile present, `npm install` still respects locked versions but doesn't fail on minor optional dependency differences.

**Lesson:** `npm ci` is strict about exact lockfile matches. `npm install` is the pragmatic choice for cross-environment Docker builds.

---

## Issue 2: Missing `public` directory

**Error:**
```
COPY --from=builder /app/public ./public — not found
```

**Root cause:** Empty `public/` directory not tracked by git.

**Solution:** Added `public/.gitkeep`.

**Lesson:** If the Dockerfile copies a directory, it must exist in the repo.

---

## Issue 3: `dotenv/config` not found in production (HISTORICAL — Prisma-specific)

> This issue applied to `prisma.config.ts` which no longer exists. Drizzle reads `DATABASE_URL` directly from environment.

**Root cause:** `prisma.config.ts` imported `dotenv/config` (a devDependency) unconditionally.

**Solution at the time:** Made the import conditional for non-production environments.

**Lesson (still relevant):** Config files loaded at runtime must not import devDependencies unconditionally.

---

## Issue 4: Prisma CLI dependency chain in production (HISTORICAL — Prisma-specific)

> This issue required 5 attempts to resolve and was a primary motivation for migrating to Drizzle.

**Root cause:** Prisma 7 with `prisma.config.ts` required the full `prisma` package and all transitive dependencies to run `prisma migrate deploy`. Cherry-picking packages failed due to deep dependency trees.

**Solution at the time:** Copy full `node_modules` from deps stage, overlaying the standalone output's minimal `node_modules`.

**Lesson:** Drizzle's migration tooling (`drizzle-kit migrate`) has a simpler dependency footprint. This was one factor in the migration decision.

---

## Issue 5: `url` not allowed in Prisma 7 schema (HISTORICAL — Prisma-specific)

> Not relevant to Drizzle. Drizzle reads connection config from `drizzle.config.ts`.

**Lesson:** Prisma 7 moved the datasource URL from schema to `prisma.config.ts`. This is a breaking change from earlier Prisma versions.

---

## Issue 6: TypeScript checking OOM on build server

**Error:** Build killed with exit code 255 during TypeScript checking.

**Root cause:** Next.js runs full TypeScript check during `next build`. On 4GB CX22 with other containers, this exhausted memory.

**Solution:** Added `typescript: { ignoreBuildErrors: true }` to `next.config.js`. Type checking runs locally.

**Lesson:** 4GB is tight for building Next.js with TypeScript checking. Skip it in Docker builds and enforce elsewhere.

---

## Issue 7: DATABASE_URL with special characters in password

**Error:** Prisma parsed username as hostname due to `/` in password.

**Root cause:** Password contained URL-delimiter characters that broke connection string parsing.

**Solution:** Use URL-safe passwords only. Generate with: `openssl rand -base64 32 | tr '/+=' '_-~'`

**Lesson (still relevant):** Database passwords in connection strings must use URL-safe characters or be URL-encoded.

---

## General recommendations

1. **Test Docker builds locally** before pushing — catches runtime dependency issues
2. **Pin Node version** across local and Dockerfile (currently both Node 24)
3. **Use URL-safe database passwords**
4. **Keep devDependencies out of runtime code paths**
5. **Accept the node_modules tradeoff** — full `node_modules` in production image is needed for Drizzle Kit migrations at startup
