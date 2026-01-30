-- AlterTable
ALTER TABLE "Pendencia" ADD COLUMN "responsavelId" INTEGER,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'aberto',
ADD COLUMN "emailPara" TEXT,
ADD COLUMN "dataLimite" TIMESTAMP(3),
ADD COLUMN "marcador" TEXT;

-- AddForeignKey
ALTER TABLE "Pendencia" ADD CONSTRAINT "Pendencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
