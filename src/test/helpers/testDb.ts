import path from "path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../../generated/prisma/client";

function createTestPrismaClient() {
  const dbUrl = process.env["DATABASE_URL"] ?? "file:./test.db";
  const dbPath = path.resolve(dbUrl.replace(/^file:/, ""));
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const testPrisma = createTestPrismaClient();

export async function cleanTestDb() {
  await testPrisma.comment.deleteMany();
  await testPrisma.visitRecord.deleteMany();
  await testPrisma.dailyReport.deleteMany();
  await testPrisma.customer.deleteMany();
  await testPrisma.salesperson.deleteMany();
}

export interface TestUser {
  id: number;
  email: string;
  name: string;
  isManager: boolean;
}

export interface TestCustomer {
  id: number;
  name: string;
}

export interface SeedResult {
  yamada: TestUser;
  tanaka: TestUser;
  suzuki: TestUser;
  admin: TestUser;
  aShoji: TestCustomer;
  bSeizo: TestCustomer;
}

export async function seedTestData(): Promise<SeedResult> {
  const passwordHash = bcrypt.hashSync("password123", 4);

  const [yamada, tanaka, suzuki, admin] = await Promise.all([
    testPrisma.salesperson.create({
      data: {
        name: "山田 太郎",
        email: "yamada@test.com",
        passwordHash,
        department: "東京営業部",
        isManager: false,
      },
    }),
    testPrisma.salesperson.create({
      data: {
        name: "田中 次郎",
        email: "tanaka@test.com",
        passwordHash,
        department: "東京営業部",
        isManager: false,
      },
    }),
    testPrisma.salesperson.create({
      data: {
        name: "鈴木 部長",
        email: "suzuki@test.com",
        passwordHash,
        department: "東京営業部",
        isManager: true,
      },
    }),
    testPrisma.salesperson.create({
      data: {
        name: "管理者",
        email: "admin@test.com",
        passwordHash,
        department: "管理部",
        isManager: true,
      },
    }),
  ]);

  const [aShoji, bSeizo] = await Promise.all([
    testPrisma.customer.create({
      data: { name: "株式会社A商事", industry: "商社" },
    }),
    testPrisma.customer.create({
      data: { name: "株式会社B製造", industry: "製造業" },
    }),
  ]);

  return {
    yamada: { id: yamada.id, email: yamada.email, name: yamada.name, isManager: yamada.isManager },
    tanaka: { id: tanaka.id, email: tanaka.email, name: tanaka.name, isManager: tanaka.isManager },
    suzuki: { id: suzuki.id, email: suzuki.email, name: suzuki.name, isManager: suzuki.isManager },
    admin: { id: admin.id, email: admin.email, name: admin.name, isManager: admin.isManager },
    aShoji: { id: aShoji.id, name: aShoji.name },
    bSeizo: { id: bSeizo.id, name: bSeizo.name },
  };
}
