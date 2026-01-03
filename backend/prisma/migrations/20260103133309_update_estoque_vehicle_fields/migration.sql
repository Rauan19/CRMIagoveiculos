/*
  Warnings:

  - You are about to drop the column `description` on the `Estoque` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Estoque` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Estoque` table. All the data in the column will be lost.
  - Added the required column `brand` to the `Estoque` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `Estoque` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Estoque` table without a default value. This is not possible if the table is not empty.

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
    "price" REAL,
    "cost" REAL,
    "tableValue" REAL,
    "discount" REAL DEFAULT 0,
    "notes" TEXT,
    "photos" TEXT,
    "totalSize" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Estoque" ("createdAt", "discount", "id", "photos", "status", "totalSize", "updatedAt") SELECT "createdAt", "discount", "id", "photos", "status", "totalSize", "updatedAt" FROM "Estoque";
DROP TABLE "Estoque";
ALTER TABLE "new_Estoque" RENAME TO "Estoque";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
