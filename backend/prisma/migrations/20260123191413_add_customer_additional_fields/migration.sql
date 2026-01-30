-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "nomeMae" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "nacionalidade" TEXT DEFAULT 'BRASILEIRA',
ADD COLUMN     "naturalidade" TEXT,
ADD COLUMN     "sexo" TEXT,
ADD COLUMN     "estadoCivil" TEXT,
ADD COLUMN     "profissao" TEXT,
ADD COLUMN     "cnh" TEXT,
ADD COLUMN     "cnhVencimento" TIMESTAMP(3),
ADD COLUMN     "website" TEXT,
ADD COLUMN     "adicional" TEXT,
ADD COLUMN     "pendenciasFinanceiras" TEXT;
