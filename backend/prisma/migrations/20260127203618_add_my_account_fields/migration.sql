-- AlterTable
ALTER TABLE "FinancialTransaction" ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL;
