-- CreateTable
CREATE TABLE "Promotion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "applicableTo" TEXT,
    "minPurchaseValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "currentValue" REAL NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tradeInId" INTEGER,
    "sellerId" INTEGER NOT NULL,
    "promotionId" INTEGER,
    "salePrice" REAL,
    "purchasePrice" REAL,
    "discountAmount" REAL,
    "profit" REAL,
    "entryValue" REAL,
    "entryType" TEXT,
    "entryVehicleValue" REAL,
    "entryAdditionalValue" REAL,
    "entryCardInstallments" INTEGER,
    "remainingValue" REAL,
    "paymentMethod" TEXT,
    "paymentInstallments" INTEGER,
    "paymentInstallmentValue" REAL,
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
    CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("commission", "contractClauses", "contractUrl", "createdAt", "customerId", "date", "entryAdditionalValue", "entryCardInstallments", "entryType", "entryValue", "entryVehicleValue", "financedValue", "id", "notes", "paymentInstallmentValue", "paymentInstallments", "paymentMethod", "profit", "purchasePrice", "remainingValue", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId") SELECT "commission", "contractClauses", "contractUrl", "createdAt", "customerId", "date", "entryAdditionalValue", "entryCardInstallments", "entryType", "entryValue", "entryVehicleValue", "financedValue", "id", "notes", "paymentInstallmentValue", "paymentInstallments", "paymentMethod", "profit", "purchasePrice", "remainingValue", "salePrice", "sellerId", "status", "tradeInId", "updatedAt", "vehicleId" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_vehicleId_key" ON "Sale"("vehicleId");
CREATE UNIQUE INDEX "Sale_tradeInId_key" ON "Sale"("tradeInId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
