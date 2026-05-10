import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const MIGRATIONS = [
  "prisma/migrations/20260509120003_init/migration.sql",
  "prisma/migrations/20260510100620_add_is_admin_to_salespersons/migration.sql",
];

export function setup() {
  const cwd = process.cwd();
  const dbPath = path.join(cwd, "test.db");

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  for (const migration of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(cwd, migration), "utf-8");
    db.exec(sql);
  }
  db.close();
}
