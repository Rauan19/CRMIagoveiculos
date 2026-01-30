-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "exitType" TEXT;

-- AlterTable
ALTER TABLE "SalePaymentMethod" ADD COLUMN     "formaPagamentoFinanciamentoProprio" TEXT,
ADD COLUMN     "trocoData" TIMESTAMP(3),
ADD COLUMN     "trocoDescricao" TEXT,
ADD COLUMN     "trocoValorTotal" DOUBLE PRECISION,
ADD COLUMN     "veiculoTrocaId" INTEGER;

-- AddForeignKey
ALTER TABLE "SalePaymentMethod" ADD CONSTRAINT "SalePaymentMethod_veiculoTrocaId_fkey" FOREIGN KEY ("veiculoTrocaId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
