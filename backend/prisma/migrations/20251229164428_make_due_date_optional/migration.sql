-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
