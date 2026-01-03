/*
  Warnings:

  - You are about to drop the column `cost` on the `Estoque` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Estoque` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Estoque` table. All the data in the column will be lost.
  - You are about to drop the column `tableValue` on the `Estoque` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Estoque" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plate" TEXT,
    "km" INTEGER,
    "color" TEXT,
    "value" REAL,
    "discount" REAL DEFAULT 0,
    "notes" TEXT,
    "photos" TEXT,
    "totalSize" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Estoque" ("brand", "color", "createdAt", "discount", "id", "km", "model", "notes", "photos", "plate", "totalSize", "updatedAt", "year") SELECT "brand", "color", "createdAt", "discount", "id", "km", "model", "notes", "photos", "plate", "totalSize", "updatedAt", "year" FROM "Estoque";
DROP TABLE "Estoque";
ALTER TABLE "new_Estoque" RENAME TO "Estoque";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
