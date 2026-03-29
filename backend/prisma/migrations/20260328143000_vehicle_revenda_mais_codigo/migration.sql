-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "revendaMaisCodigo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_revendaMaisCodigo_key" ON "Vehicle"("revendaMaisCodigo");
