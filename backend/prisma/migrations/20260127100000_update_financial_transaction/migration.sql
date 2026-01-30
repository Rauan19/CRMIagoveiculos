-- CreateTable
CREATE TABLE "CategoriaFinanceira" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "parentId" INTEGER,
    "codigo" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaFinanceira_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN "operacao" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "posicaoEstoque" INTEGER;
ALTER TABLE "FinancialTransaction" ADD COLUMN "solicitadoPor" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "autorizadoPor" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "dataVencimento" TIMESTAMP(3);
ALTER TABLE "FinancialTransaction" ADD COLUMN "mesReferencia" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "numeroDocumento" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "valorTitulo" DOUBLE PRECISION;
ALTER TABLE "FinancialTransaction" ADD COLUMN "customerId" INTEGER;
ALTER TABLE "FinancialTransaction" ADD COLUMN "categoriaFinanceiraId" INTEGER;
ALTER TABLE "FinancialTransaction" ADD COLUMN "observacoes" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "formaPagamento" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "isDespesa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinancialTransaction" ADD COLUMN "recorrente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinancialTransaction" ADD COLUMN "darBaixa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinancialTransaction" ADD COLUMN "marcador" TEXT;

-- Migrar dados existentes
UPDATE "FinancialTransaction" SET "operacao" = CASE WHEN "type" = 'receber' THEN 'receber' ELSE 'pagar' END WHERE "operacao" IS NULL;
UPDATE "FinancialTransaction" SET "valorTitulo" = "amount" WHERE "valorTitulo" IS NULL;
UPDATE "FinancialTransaction" SET "dataVencimento" = "dueDate" WHERE "dataVencimento" IS NULL;

-- AddForeignKey
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CategoriaFinanceira"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoriaFinanceiraId_fkey" FOREIGN KEY ("categoriaFinanceiraId") REFERENCES "CategoriaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE;
