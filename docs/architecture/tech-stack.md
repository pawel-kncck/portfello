# Tech Stack

> Source of truth: `package.json`. If this document conflicts with the actual dependencies, the code wins.

## Stack overview

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript | 5.2.2 |
| Runtime | Node.js | >= 22.12.0 |
| Database | PostgreSQL | 16 |
| ORM | Drizzle ORM + Drizzle Kit | 0.44.2 / 0.31.1 |
| Auth | Auth.js (NextAuth v5) + @auth/drizzle-adapter | 5.0.0-beta.30 |
| UI | Radix UI primitives + Tailwind CSS | 3.4.0 |
| Charts | Recharts | - |
| Validation | Zod | 3.22.4 |
| Password hashing | bcryptjs | 3.0.3 |
| DB client | pg | 8.16.0 |
| Icons | Lucide React | - |
| Testing | Vitest + @testing-library/react | 4.1.2 |
| Deployment | Docker on Coolify (Hetzner) | - |

## Key decisions

### Drizzle ORM (migrated from Prisma 7)

The app originally used Prisma 7 with `@prisma/adapter-pg`. It was migrated to Drizzle ORM for:
- Simpler runtime — no generated client, no separate CLI dependency chain
- Lighter Docker images — Prisma 7 required the full `node_modules` overlay in production (see [learnings/deployment-lessons.md](../learnings/deployment-lessons.md))
- SQL-like API closer to the actual queries being run

Schema lives in `lib/schema.ts`. Migrations in `drizzle/`. Config in `drizzle.config.ts`.

### Auth.js with Credentials provider

JWT session strategy — no server-side session storage. Password hashing with bcryptjs (12 rounds). The `@auth/drizzle-adapter` manages auth tables (users, accounts, sessions, verification_tokens) in the app's own database.

No OAuth providers configured. No email verification or password reset (out of scope).

### Next.js standalone output

`output: 'standalone'` in `next.config.js` produces a self-contained build for Docker. The `serverExternalPackages` option ensures `pg` and `bcryptjs` are traced into the standalone output.

TypeScript build errors are ignored in Docker builds (`typescript: { ignoreBuildErrors: true }`) to avoid OOM on the 4GB build server. Type checking runs locally during development.

### Internationalization

Custom i18n solution in `lib/i18n/` with Polish and English. User preference stored in the `language` column on the users table. No framework-level i18n (no next-intl or similar).

## Security headers

Configured in `next.config.js`:

- `Strict-Transport-Security`: max-age=31536000; includeSubDomains
- `X-Frame-Options`: DENY
- `X-Content-Type-Options`: nosniff
- `Referrer-Policy`: strict-origin-when-cross-origin

## Testing

- Runner: Vitest
- Components: @testing-library/react + @testing-library/jest-dom
- Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Test locations: `tests/unit/` (validation, rules, i18n), `tests/components/` (React components)
- No API integration tests yet
