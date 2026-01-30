-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN "dataTransferencia" TIMESTAMP(3);
ALTER TABLE "FinancialTransaction" ADD COLUMN "contaOrigem" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "contaDestino" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "valorTransferencia" DOUBLE PRECISION;
