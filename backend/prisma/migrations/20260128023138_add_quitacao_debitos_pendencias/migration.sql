-- CreateTable
CREATE TABLE "ParcelaQuitacao" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "valorQuitacao" DOUBLE PRECISION NOT NULL,
    "qtdParcelas" INTEGER NOT NULL,
    "valorParcela" DOUBLE PRECISION NOT NULL,
    "primeiroVcto" TIMESTAMP(3) NOT NULL,
    "observacoesInternas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParcelaQuitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debito" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendencia" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pendencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParcelaQuitacao" ADD CONSTRAINT "ParcelaQuitacao_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debito" ADD CONSTRAINT "Debito_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendencia" ADD CONSTRAINT "Pendencia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
