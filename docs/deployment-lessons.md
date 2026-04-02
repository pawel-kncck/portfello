# Deployment Lessons Learned

A record of every deployment issue encountered during the initial Portfello deployment to Coolify, what caused each one, and how it was resolved. Written to prevent repeating these mistakes.

---

## Context

- **App**: Next.js 16 with Prisma 7, deployed via Docker on Coolify (Hetzner CX22, 4GB RAM)
- **Database**: PostgreSQL 16 on a separate Hetzner server, connected via private network
- **Date**: 2026-04-02
- **Commits**: `db9dc61` through `c41e147` (9 fix commits before a successful deploy)

---

## Issue 1: `npm ci` fails — lockfile out of sync

**Error:**
```
npm ci can only install packages when your package.json and package-lock.json
are in sync. Missing: @emnapi/runtime@1.9.1 from lock file
```

**Root cause:** The lockfile was generated locally with npm 11 (Node 24), but the Dockerfile used `node:22-alpine` which ships npm 10. Different npm versions resolve optional platform-specific dependencies differently (`@emnapi/runtime`, `@emnapi/core`, `@emnapi/wasi-threads`). npm 10 expected entries that npm 11 didn't include.

**What we tried:**
1. Regenerated `package-lock.json` with `rm package-lock.json && npm install` — didn't help because local npm 11 still generated an incompatible lockfile
2. Upgraded Dockerfile to `node:24-alpine` to match local — still failed because Docker's npm 11.11.0 differed from local npm 11.6.2

**Solution:** Switched from `npm ci` to `npm install` in the Dockerfile. With a lockfile present, `npm install` still respects locked versions but doesn't fail on minor platform-specific optional dependency differences.

**Lesson:** `npm ci` is strict about exact lockfile matches. When the build environment and dev environment have different npm versions or platforms, `npm ci` will reject the lockfile over optional dependencies that only exist on one platform. `npm install` is the pragmatic choice for cross-environment Docker builds.

---

## Issue 2: Missing `public` directory

**Error:**
```
COPY --from=builder /app/public ./public
"/app/public": not found
```

**Root cause:** The `public/` directory existed locally but was empty. Git doesn't track empty directories, so it wasn't in the repo. The Dockerfile's `COPY` instruction failed because the directory didn't exist in the build context.

**Solution:** Added `public/.gitkeep` to track the empty directory in git.

**Lesson:** If the Dockerfile copies a directory, that directory must exist in the repo. Either add a `.gitkeep` or make the `COPY` conditional.

---

## Issue 3: `dotenv/config` not found in production

**Error:**
```
Cannot find module 'dotenv/config'
Require stack: /app/prisma.config.ts
```

**Root cause:** `prisma.config.ts` had `import "dotenv/config"` at the top. `dotenv` is a devDependency — it's installed during `npm install` in the build stage but not present in the production runner image. The container startup runs `prisma migrate deploy`, which loads `prisma.config.ts`, which fails on the import.

**Solution:** Made the dotenv import conditional:
```ts
if (process.env.NODE_ENV !== "production") {
  import("dotenv/config").catch(() => {});
}
```

In production, Coolify injects env vars directly — dotenv isn't needed.

**Lesson:** Config files loaded at runtime must not import devDependencies unconditionally. Either guard the import or move the dependency to `dependencies`.

---

## Issue 4: Prisma CLI not available in production image

This was the most complex issue, requiring 5 attempts to resolve.

### Attempt 1: Global prisma install

The original Dockerfile had `RUN npm install -g prisma` in the runner stage. This worked before Prisma 7, but Prisma 7 introduced `prisma.config.ts` which imports from `prisma/config`. The global install doesn't make `prisma/config` resolvable from `/app/`.

**Error:**
```
Cannot find module 'prisma/config'
Require stack: /app/prisma.config.ts
```

### Attempt 2: Cherry-pick node_modules

Copied `node_modules/prisma` and `node_modules/@prisma` from the builder:
```dockerfile
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

**Error:**
```
Cannot find module 'pathe'
```

Prisma has deep transitive dependencies (`pathe`, `@prisma/dev`, `@prisma/debug`, etc.) that weren't included.

### Attempt 3: Direct entry point

Used `node node_modules/prisma/build/index.js` to bypass the missing bin symlink.

**Error:** Same missing transitive dependency issue.

### Attempt 4: `npm install prisma` in runner

Tried `RUN npm install --no-save prisma` in the runner stage to get the full dependency tree.

**Error:**
```
Cannot find module '/app/node_modules/@prisma/debug/dist/index.js'
```

The standalone Next.js output has its own `node_modules/` with traced production dependencies. Installing prisma into this context created conflicts — the `@prisma/engines` postinstall script failed because it found partial `@prisma/*` packages from the standalone output.

### Attempt 5 (solution): Full node_modules overlay

Copy the complete `node_modules` from the deps stage on top of the standalone output:

```dockerfile
# Standalone output (has minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Full node_modules overlays the standalone's minimal one
COPY --from=deps /app/node_modules ./node_modules
```

This works because the full `node_modules` is a superset of the standalone's — all runtime deps are present, plus the prisma CLI and its full dependency tree. The `COPY` order matters: standalone first, then overlay.

**Tradeoff:** The image is larger than a minimal standalone image. This is acceptable for a self-hosted app on dedicated infrastructure.

**Lesson:** Prisma 7 with the adapter pattern (`@prisma/adapter-pg`) and `prisma.config.ts` requires the full `prisma` package and all its transitive dependencies to run `prisma migrate deploy`. You cannot cherry-pick packages — the dependency tree is too deep. Either overlay the full node_modules or run migrations in a separate container/stage.

---

## Issue 5: `url` not allowed in Prisma 7 schema

**Error:**
```
The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts`.
```

**Root cause:** We tried adding `url = env("DATABASE_URL")` to the schema so the CLI could read the database URL directly, eliminating the need for `prisma.config.ts`. But Prisma 7 explicitly removed this — the URL must be in `prisma.config.ts`.

**Solution:** Reverted the schema change. Kept `prisma.config.ts` as the source of the database URL for the CLI.

**Lesson:** Prisma 7 is a breaking change from earlier versions. The datasource `url` belongs in `prisma.config.ts`, not the schema. The schema only declares the `provider`.

---

## Issue 6: TypeScript checking OOM on build server

**Error:** Build killed with exit code 255 during "Running TypeScript ..." step.

**Root cause:** Next.js runs a full TypeScript check during `next build`. On the 4GB CX22 server — already running other containers — this exhausted available memory and the process was OOM-killed.

**Solution:** Added `typescript: { ignoreBuildErrors: true }` to `next.config.js`. Type checking runs locally during development and can be added to CI later.

**Lesson:** 4GB is tight for building Next.js apps with TypeScript checking. Either skip type checking in the Docker build (enforce it elsewhere) or use a larger build server.

---

## Issue 7: DATABASE_URL with special characters in password

**Error:**
```
Can't reach database server at `portfello_user:5432`
```

Prisma parsed the username as the hostname.

**Root cause:** The database password contained `/` characters, which are URL delimiters. The unencoded password broke the connection string parsing — everything after the `/` in the password was misinterpreted.

**Solution:** URL-encode special characters in the password (`/` → `%2F`). Then switched to a password using only URL-safe characters (`A-Z a-z 0-9 - _ . ~`).

**Lesson:** Database passwords in connection strings must be URL-encoded if they contain special characters. Better yet, generate passwords using only unreserved characters: `openssl rand -base64 32 | tr '/+=' '_-~'`

---

## Recommendations

### 1. Test Docker builds locally before pushing

```bash
docker build -t portfello-test .
docker run --rm \
  -e DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/db" \
  -e AUTH_SECRET="..." \
  -e AUTH_URL="http://localhost:3000" \
  -p 3000:3000 portfello-test
```

This catches runtime dependency issues, missing files, and config errors before they reach Coolify. Every issue in this document would have been caught locally.

### 2. Add a pre-push check

A git hook or CI step that runs:
```bash
npm test
npm run build
docker build -t portfello-test .
```

### 3. Pin the Node version

Use the same major Node version everywhere. Currently:
- Local: Node 24
- Dockerfile: `node:24-alpine`
- Keep these in sync. Update both when upgrading.

### 4. Use URL-safe database passwords

Generate with: `openssl rand -base64 32 | tr '/+=' '_-~'`

Avoids encoding issues in connection strings, environment variables, and config files.

### 5. Keep devDependencies out of runtime code paths

Any file loaded at container startup (`prisma.config.ts`, etc.) must not unconditionally import devDependencies. Guard imports or move them to `dependencies`.

### 6. Accept the node_modules tradeoff for Prisma 7

Prisma 7's architecture requires the full package for CLI operations. The image is larger, but the alternative (running migrations in a separate container) adds operational complexity. Revisit if image size becomes a deployment bottleneck.
