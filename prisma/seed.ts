import "dotenv/config";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = path.resolve(dbUrl.replace(/^file:/, ""));
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // パスワードのハッシュ化（全ユーザー共通: password123）
  const passwordHash = await bcrypt.hash("password123", 12);

  // -----------------------------------------------------------------------
  // 営業マスタ（テスト仕様書 3.2）
  // -----------------------------------------------------------------------
  const yamada = await prisma.salesperson.upsert({
    where: { email: "yamada@test.com" },
    update: {},
    create: {
      name: "山田 太郎",
      email: "yamada@test.com",
      passwordHash,
      department: "東京営業部",
      isManager: false,
    },
  });

  const tanaka = await prisma.salesperson.upsert({
    where: { email: "tanaka@test.com" },
    update: {},
    create: {
      name: "田中 次郎",
      email: "tanaka@test.com",
      passwordHash,
      department: "東京営業部",
      isManager: false,
    },
  });

  const suzuki = await prisma.salesperson.upsert({
    where: { email: "suzuki@test.com" },
    update: {},
    create: {
      name: "鈴木 部長",
      email: "suzuki@test.com",
      passwordHash,
      department: "東京営業部",
      isManager: true,
    },
  });

  const admin = await prisma.salesperson.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "管理者",
      email: "admin@test.com",
      passwordHash,
      department: "管理部",
      isManager: false,
      isAdmin: true,
    },
  });

  console.log("✅ 営業マスタ:", yamada.name, tanaka.name, suzuki.name, admin.name);

  // -----------------------------------------------------------------------
  // 顧客マスタ（テスト仕様書 3.2）
  // -----------------------------------------------------------------------
  const customerA = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "株式会社A商事",
      industry: "商社",
      address: "東京都千代田区丸の内1-1-1",
      phone: "03-1234-5678",
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "株式会社B製造",
      industry: "製造業",
      address: "東京都港区芝公園2-2-2",
      phone: "03-8765-4321",
    },
  });

  console.log("✅ 顧客マスタ:", customerA.name, customerB.name);

  console.log("🎉 シードデータの投入が完了しました");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
