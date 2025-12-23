-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
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
    "customerId" INTEGER,
    "notes" TEXT,
    "photos" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disponivel',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("brand", "color", "cost", "createdAt", "customerId", "id", "km", "model", "notes", "photos", "plate", "price", "status", "tableValue", "updatedAt", "year") SELECT "brand", "color", "cost", "createdAt", "customerId", "id", "km", "model", "notes", "photos", "plate", "price", "status", "tableValue", "updatedAt", "year" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
