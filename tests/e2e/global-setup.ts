import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export default function globalSetup() {
  const cwd = process.cwd();
  const dbPath = path.join(cwd, "dev.db");
  const migrationPath = path.join(cwd, "prisma/migrations/20260509120003_init/migration.sql");

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.exec(sql);

  const passwordHash = bcrypt.hashSync("password123", 4);
  const now = new Date().toISOString();

  // ユーザー登録
  const insertUser = db.prepare(
    `INSERT INTO salespersons (name, email, password_hash, department, is_manager, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertUser.run("山田 太郎", "yamada@test.com", passwordHash, "東京営業部", 0, now);
  insertUser.run("田中 次郎", "tanaka@test.com", passwordHash, "東京営業部", 0, now);
  insertUser.run("鈴木 部長", "suzuki@test.com", passwordHash, "東京営業部", 1, now);
  insertUser.run("管理者", "admin@test.com", passwordHash, "管理部", 1, now);

  // 顧客登録
  const insertCustomer = db.prepare(
    `INSERT INTO customers (name, industry, updated_at) VALUES (?, ?, ?)`,
  );
  insertCustomer.run("株式会社A商事", "商社", now);
  insertCustomer.run("株式会社B製造", "製造業", now);

  // テスト用日報（担当者IDを取得）
  const yamadaId = (
    db.prepare("SELECT id FROM salespersons WHERE email = ?").get("yamada@test.com") as {
      id: number;
    }
  ).id;
  const tanakaId = (
    db.prepare("SELECT id FROM salespersons WHERE email = ?").get("tanaka@test.com") as {
      id: number;
    }
  ).id;
  const customerAId = (
    db.prepare("SELECT id FROM customers WHERE name = ?").get("株式会社A商事") as { id: number }
  ).id;

  const insertReport = db.prepare(
    `INSERT INTO daily_reports (salesperson_id, report_date, problem, plan, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  // 山田: 2026-05-06 提出済み（コメント・ダッシュボードテスト用）
  const yamadaRpt1 = insertReport.run(
    yamadaId,
    "2026-05-06T00:00:00.000Z",
    "A社の課題",
    "B社を訪問する",
    "submitted",
    now,
  );
  db.prepare(
    `INSERT INTO visit_records (daily_report_id, customer_id, visit_content, sort_order) VALUES (?, ?, ?, ?)`,
  ).run(yamadaRpt1.lastInsertRowid, customerAId, "A社との商談", 1);

  // 山田: 2026-05-08 提出済み（確認済み操作テスト用）
  const yamadaRpt2 = insertReport.run(
    yamadaId,
    "2026-05-08T00:00:00.000Z",
    "C社の課題",
    "D社を訪問する",
    "submitted",
    now,
  );
  db.prepare(
    `INSERT INTO visit_records (daily_report_id, customer_id, visit_content, sort_order) VALUES (?, ?, ?, ?)`,
  ).run(yamadaRpt2.lastInsertRowid, customerAId, "C社との商談", 1);

  // 田中: 2026-06-01 提出済み（上長権限テスト用）
  const tanakaRpt = insertReport.run(
    tanakaId,
    "2026-06-01T00:00:00.000Z",
    "田中課題",
    "田中計画",
    "submitted",
    now,
  );
  db.prepare(
    `INSERT INTO visit_records (daily_report_id, customer_id, visit_content, sort_order) VALUES (?, ?, ?, ?)`,
  ).run(tanakaRpt.lastInsertRowid, customerAId, "田中訪問", 1);

  db.close();
}
