import { PrismaClient } from "../../generated/prisma/client";

function createPrismaClient() {
  const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";

  if (dbUrl.startsWith("file:")) {
    // SQLite for local development — use the better-sqlite3 driver adapter
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const dbPath = path.resolve(dbUrl.replace(/^file:/, ""));
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({ adapter });
  }

  // PostgreSQL for production — native Prisma connection (no custom adapter)
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
