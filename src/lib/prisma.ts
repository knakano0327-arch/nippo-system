import { PrismaClient } from "../../generated/prisma/client";

// SQLite client is created via require() so the native better-sqlite3 module is
// only loaded in environments that actually need it (local dev / tests).
// Top-level imports would bundle the native module into the production build.
function createSQLiteClient(dbUrl: string): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as { resolve: (...args: string[]) => string };
  const dbPath = path.resolve(dbUrl.replace(/^file:/, ""));
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
  return dbUrl.startsWith("file:") ? createSQLiteClient(dbUrl) : new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
