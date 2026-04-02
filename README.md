# Portfello

A personal finance tracking application built with Next.js, Prisma, and PostgreSQL.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5
- **UI:** Tailwind CSS, Radix UI, shadcn/ui
- **Charts:** Recharts

## Prerequisites

- Node.js >= 22.12.0
- PostgreSQL

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Deployment

See [docs/deployment-guide.md](docs/deployment-guide.md) for Docker and production deployment instructions.
