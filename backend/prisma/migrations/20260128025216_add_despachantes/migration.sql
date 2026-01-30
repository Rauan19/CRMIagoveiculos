-- CreateTable
CREATE TABLE "Despachante" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'saida',
    "despachanteNome" TEXT,
    "vehicleId" INTEGER,
    "fornecedorId" INTEGER,
    "customerId" INTEGER,
    "dataEnvio" TIMESTAMP(3),
    "dataRetorno" TIMESTAMP(3),
    "dataEntrega" TIMESTAMP(3),
    "obsAdicional" TEXT,
    "municipioOrigem" TEXT,
    "municipioDestino" TEXT,
    "documentos" JSONB,
    "valores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Despachante_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Despachante" ADD CONSTRAINT "Despachante_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despachante" ADD CONSTRAINT "Despachante_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
