/*
  Adds enrollment/registration dates and soft-delete support for students and
  guardians, plus the archive retention period used by the cleanup job.
*/
-- CreateEnum
CREATE TYPE "GuardianStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "students"
ADD COLUMN     "enrolledAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "archivedAt" DATE;

-- AlterTable
ALTER TABLE "guardians"
ADD COLUMN     "status" "GuardianStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "enrolledAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "archivedAt" DATE;

-- AlterTable
ALTER TABLE "registration_settings" ADD COLUMN     "archiveRetentionMonths" INTEGER NOT NULL DEFAULT 24;

-- Backfill the archive date for students that were already archived before this
-- migration. `updatedAt` is the closest available approximation.
UPDATE "students"
SET "archivedAt" = "updatedAt"::date
WHERE "status" = 'ARCHIVED' AND "archivedAt" IS NULL;

-- CreateIndex
CREATE INDEX "students_archivedAt_idx" ON "students"("archivedAt");

-- CreateIndex
CREATE INDEX "guardians_status_idx" ON "guardians"("status");

-- CreateIndex
CREATE INDEX "guardians_archivedAt_idx" ON "guardians"("archivedAt");
