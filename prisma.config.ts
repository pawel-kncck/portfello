import { defineConfig } from "prisma/config";

// Load .env in development (dotenv is a devDependency, not available in production)
if (process.env.NODE_ENV !== "production") {
  import("dotenv/config").catch(() => {});
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
