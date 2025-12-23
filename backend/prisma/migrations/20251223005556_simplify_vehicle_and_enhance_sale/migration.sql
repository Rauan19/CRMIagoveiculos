/*
  Warnings:

  - You are about to drop the column `entryPaymentMethod` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `accessories` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `chassi` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `doors` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `engine` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `entryDate` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `entryValue` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `financedValue` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `fuel` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceValue` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `ipvaValue` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `renavam` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `seller` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `transmission` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `Vehicle` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tradeInId" INTEGER,
    "sellerId" INTEGER NOT NULL,
    "salePrice" REAL NOT NULL,
    "purchasePrice" REAL,
    "profit" REAL,
    "entryValue" REAL,
    "entryType" TEXT,
    "entryVehicleValue" REAL,
    "entryCardInstallments" INTEGER,
    "remainingValue" REAL,
    "paymentMethod" TEXT,
    "paymentInstallments" INTEGER,
    "financedValue" REAL,
    "commission" REAL,
    "contractUrl" TEXT,
    "contractClauses" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_tradeInId_fkey" FOREIGN KEY ("tradeInId") REFERENCES "TradeIn" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("commission", "contractUrl", "createdAt", "customerId", "date", "entryValue", "financedValue", "id", "notes", "paymentMethod", "remainingValue", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId") SELECT "commission", "contractUrl", "createdAt", "customerId", "date", "entryValue", "financedValue", "id", "notes", "paymentMethod", "remainingValue", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_vehicleId_key" ON "Sale"("vehicleId");
CREATE UNIQUE INDEX "Sale_tradeInId_key" ON "Sale"("tradeInId");
CREATE TABLE "new_Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plate" TEXT,
    "km" INTEGER,
    "color" TEXT,
    "price" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "tableValue" REAL,
    "customerId" INTEGER,
    "notes" TEXT,
    "photos" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disponivel',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("brand", "color", "cost", "createdAt", "id", "km", "model", "notes", "photos", "plate", "price", "status", "updatedAt", "year") SELECT "brand", "color", "cost", "createdAt", "id", "km", "model", "notes", "photos", "plate", "price", "status", "updatedAt", "year" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
