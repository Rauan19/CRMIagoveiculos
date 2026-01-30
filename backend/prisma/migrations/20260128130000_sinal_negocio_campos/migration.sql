-- AlterTable: add new columns to SinalNegocio
ALTER TABLE "SinalNegocio" ADD COLUMN "sellerId" INTEGER;
ALTER TABLE "SinalNegocio" ADD COLUMN "dataValidade" TIMESTAMP(3);
ALTER TABLE "SinalNegocio" ADD COLUMN "valorVeiculo" DOUBLE PRECISION;
ALTER TABLE "SinalNegocio" ADD COLUMN "valorEmAberto" DOUBLE PRECISION;
ALTER TABLE "SinalNegocio" ADD COLUMN "formaPagamento" TEXT;

-- Set default sellerId for existing rows (first user)
UPDATE "SinalNegocio" SET "sellerId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "sellerId" IS NULL;

-- Make sellerId NOT NULL
ALTER TABLE "SinalNegocio" ALTER COLUMN "sellerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "SinalNegocio" ADD CONSTRAINT "SinalNegocio_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
