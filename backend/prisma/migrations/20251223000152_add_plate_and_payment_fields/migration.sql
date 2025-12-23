/*
  Warnings:

  - You are about to drop the column `entryCash` on the `Sale` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "plate" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "saleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialTransaction" ("amount", "createdAt", "description", "dueDate", "id", "paidDate", "saleId", "status", "type", "updatedAt") SELECT "amount", "createdAt", "description", "dueDate", "id", "paidDate", "saleId", "status", "type", "updatedAt" FROM "FinancialTransaction";
DROP TABLE "FinancialTransaction";
ALTER TABLE "new_FinancialTransaction" RENAME TO "FinancialTransaction";
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tradeInId" INTEGER,
    "sellerId" INTEGER NOT NULL,
    "salePrice" REAL NOT NULL,
    "entryValue" REAL,
    "entryPaymentMethod" TEXT,
    "remainingValue" REAL,
    "paymentMethod" TEXT,
    "financedValue" REAL,
    "commission" REAL,
    "contractUrl" TEXT,
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
INSERT INTO "new_Sale" ("commission", "contractUrl", "createdAt", "customerId", "date", "financedValue", "id", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId") SELECT "commission", "contractUrl", "createdAt", "customerId", "date", "financedValue", "id", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_vehicleId_key" ON "Sale"("vehicleId");
CREATE UNIQUE INDEX "Sale_tradeInId_key" ON "Sale"("tradeInId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
