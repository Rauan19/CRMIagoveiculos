-- CreateTable
CREATE TABLE "SalePaymentMethod" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "valorFinanciado" DOUBLE PRECISION,
    "quantidadeParcelas" INTEGER,
    "frequencia15Dias" BOOLEAN DEFAULT false,
    "manterDataFixa" BOOLEAN DEFAULT false,
    "valorParcela" DOUBLE PRECISION,
    "numeroPrimeiroDoc" TEXT,
    "numeroDocumento" TEXT,
    "descricao" TEXT,
    "avalista" TEXT,
    "avalistaAdicional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalePaymentMethod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalePaymentMethod" ADD CONSTRAINT "SalePaymentMethod_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
