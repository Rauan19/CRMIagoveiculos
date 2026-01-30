-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "documentMime" TEXT,
ADD COLUMN     "documentName" TEXT,
ADD COLUMN     "documentPdf" BYTEA,
ADD COLUMN     "documentUpdatedAt" TIMESTAMP(3);
