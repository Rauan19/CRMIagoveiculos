-- CreateTable
CREATE TABLE "VehicleDevolucao" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER,
    "revendaMaisCodigo" TEXT,
    "dataCompra" TIMESTAMP(3),
    "dataDevolucao" TIMESTAMP(3),
    "localizacao" TEXT,
    "sourceFile" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDevolucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDevolucao_rowHash_key" ON "VehicleDevolucao"("rowHash");

-- CreateIndex
CREATE INDEX "VehicleDevolucao_vehicleId_idx" ON "VehicleDevolucao"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDevolucao_revendaMaisCodigo_idx" ON "VehicleDevolucao"("revendaMaisCodigo");

-- AddForeignKey
ALTER TABLE "VehicleDevolucao" ADD CONSTRAINT "VehicleDevolucao_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
