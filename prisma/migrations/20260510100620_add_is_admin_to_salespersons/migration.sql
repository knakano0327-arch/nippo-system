-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_salespersons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "department" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);
INSERT INTO "new_salespersons" ("created_at", "deleted_at", "department", "email", "id", "is_manager", "name", "password_hash", "updated_at") SELECT "created_at", "deleted_at", "department", "email", "id", "is_manager", "name", "password_hash", "updated_at" FROM "salespersons";
DROP TABLE "salespersons";
ALTER TABLE "new_salespersons" RENAME TO "salespersons";
CREATE UNIQUE INDEX "salespersons_email_key" ON "salespersons"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
