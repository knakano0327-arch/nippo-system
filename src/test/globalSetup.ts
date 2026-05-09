import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function setup() {
  const cwd = process.cwd();
  const dbPath = path.join(cwd, "test.db");
  const migrationPath = path.join(cwd, "prisma/migrations/20260509120003_init/migration.sql");

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.exec(sql);
  db.close();
}
