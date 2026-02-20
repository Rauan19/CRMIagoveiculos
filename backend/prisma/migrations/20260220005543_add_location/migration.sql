-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER,
    "location" TEXT NOT NULL,
    "yard" TEXT,
    "expectedReturn" TIMESTAMP(3),
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
