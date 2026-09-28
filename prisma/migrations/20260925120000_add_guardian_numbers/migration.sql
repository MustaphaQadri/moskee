-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "donationNumber" TEXT,
ADD COLUMN     "educationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guardians_donationNumber_key" ON "guardians"("donationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_educationNumber_key" ON "guardians"("educationNumber");
