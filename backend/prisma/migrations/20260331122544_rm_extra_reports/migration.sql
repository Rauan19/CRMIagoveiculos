-- CreateTable
CREATE TABLE "VehicleNota" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER,
    "revendaMaisCodigo" TEXT,
    "plateOrChassi" TEXT,
    "nota" TEXT,
    "dtNota" TIMESTAMP(3),
    "cfop" TEXT,
    "ncm" TEXT,
    "cst" TEXT,
    "icms" DOUBLE PRECISION,
    "nomeDest" TEXT,
    "filial" TEXT,
    "valorEntrada" DOUBLE PRECISION,
    "valorSaida" DOUBLE PRECISION,
    "sourceFile" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleImposto" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER,
    "vehicleId" INTEGER,
    "revendaMaisCodigo" TEXT,
    "dtVenda" TIMESTAMP(3),
    "cfop" TEXT,
    "valorCompra" DOUBLE PRECISION,
    "valorVenda" DOUBLE PRECISION,
    "icms" DOUBLE PRECISION,
    "pis" DOUBLE PRECISION,
    "cofins" DOUBLE PRECISION,
    "irpj" DOUBLE PRECISION,
    "csll" DOUBLE PRECISION,
    "localizacao" TEXT,
    "sourceFile" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleImposto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleCheque" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER,
    "vehicleId" INTEGER,
    "revendaMaisCodigo" TEXT,
    "dataVenda" TIMESTAMP(3),
    "valor" DOUBLE PRECISION,
    "vendedor" TEXT,
    "fornecedor" TEXT,
    "filial" TEXT,
    "localizacao" TEXT,
    "sourceFile" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleCheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleTroca" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER,
    "vehicleId" INTEGER,
    "revendaMaisCodigo" TEXT,
    "dtVenda" TIMESTAMP(3),
    "valorVenda" DOUBLE PRECISION,
    "veiculoTrocaRaw" TEXT,
    "valorTroca" DOUBLE PRECISION,
    "outrasFormas" DOUBLE PRECISION,
    "valorLiquido" DOUBLE PRECISION,
    "fornecedor" TEXT,
    "sourceFile" TEXT NOT NULL,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleTroca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleNota_rowHash_key" ON "VehicleNota"("rowHash");

-- CreateIndex
CREATE INDEX "VehicleNota_vehicleId_idx" ON "VehicleNota"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleNota_revendaMaisCodigo_idx" ON "VehicleNota"("revendaMaisCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "SaleImposto_rowHash_key" ON "SaleImposto"("rowHash");

-- CreateIndex
CREATE INDEX "SaleImposto_saleId_idx" ON "SaleImposto"("saleId");

-- CreateIndex
CREATE INDEX "SaleImposto_vehicleId_idx" ON "SaleImposto"("vehicleId");

-- CreateIndex
CREATE INDEX "SaleImposto_revendaMaisCodigo_idx" ON "SaleImposto"("revendaMaisCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "SaleCheque_rowHash_key" ON "SaleCheque"("rowHash");

-- CreateIndex
CREATE INDEX "SaleCheque_saleId_idx" ON "SaleCheque"("saleId");

-- CreateIndex
CREATE INDEX "SaleCheque_vehicleId_idx" ON "SaleCheque"("vehicleId");

-- CreateIndex
CREATE INDEX "SaleCheque_revendaMaisCodigo_idx" ON "SaleCheque"("revendaMaisCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "SaleTroca_rowHash_key" ON "SaleTroca"("rowHash");

-- CreateIndex
CREATE INDEX "SaleTroca_saleId_idx" ON "SaleTroca"("saleId");

-- CreateIndex
CREATE INDEX "SaleTroca_vehicleId_idx" ON "SaleTroca"("vehicleId");

-- CreateIndex
CREATE INDEX "SaleTroca_revendaMaisCodigo_idx" ON "SaleTroca"("revendaMaisCodigo");

-- AddForeignKey
ALTER TABLE "VehicleNota" ADD CONSTRAINT "VehicleNota_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleImposto" ADD CONSTRAINT "SaleImposto_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleImposto" ADD CONSTRAINT "SaleImposto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCheque" ADD CONSTRAINT "SaleCheque_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCheque" ADD CONSTRAINT "SaleCheque_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTroca" ADD CONSTRAINT "SaleTroca_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTroca" ADD CONSTRAINT "SaleTroca_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
