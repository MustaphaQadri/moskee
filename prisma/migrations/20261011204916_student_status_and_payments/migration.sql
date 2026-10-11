/*
  Adds the student lifecycle status (+ history), the donation payment ledger and
  its audit log. The old single `student_donations.paidAmount`/`paidAt` are
  backfilled into `donation_payments` (and a CREATED log) before being dropped.
*/
-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('WAITING_LIST', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DonationPaymentAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'WAITING_LIST';

-- CreateTable
CREATE TABLE "student_status_events" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromStatus" "StudentStatus",
    "toStatus" "StudentStatus" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "student_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" DATE NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_payment_logs" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "action" "DonationPaymentAction" NOT NULL,
    "amountBefore" DECIMAL(10,2),
    "amountAfter" DECIMAL(10,2),
    "paidAtBefore" DATE,
    "paidAtAfter" DATE,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_status_events_studentId_idx" ON "student_status_events"("studentId");

-- CreateIndex
CREATE INDEX "student_status_events_changedById_idx" ON "student_status_events"("changedById");

-- CreateIndex
CREATE INDEX "donation_payments_studentId_academicYearId_idx" ON "donation_payments"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "donation_payments_academicYearId_idx" ON "donation_payments"("academicYearId");

-- CreateIndex
CREATE INDEX "donation_payments_recordedById_idx" ON "donation_payments"("recordedById");

-- CreateIndex
CREATE INDEX "donation_payment_logs_studentId_academicYearId_idx" ON "donation_payment_logs"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "donation_payment_logs_paymentId_idx" ON "donation_payment_logs"("paymentId");

-- CreateIndex
CREATE INDEX "donation_payment_logs_actorId_idx" ON "donation_payment_logs"("actorId");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- AddForeignKey
ALTER TABLE "student_status_events" ADD CONSTRAINT "student_status_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_events" ADD CONSTRAINT "student_status_events_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payments" ADD CONSTRAINT "donation_payments_studentId_academicYearId_fkey" FOREIGN KEY ("studentId", "academicYearId") REFERENCES "student_donations"("studentId", "academicYearId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payments" ADD CONSTRAINT "donation_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payment_logs" ADD CONSTRAINT "donation_payment_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "donation_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payment_logs" ADD CONSTRAINT "donation_payment_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payment_logs" ADD CONSTRAINT "donation_payment_logs_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_payment_logs" ADD CONSTRAINT "donation_payment_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

-- Derive each student's lifecycle status from their enrollment history.
UPDATE "students" SET "status" = 'ACTIVE'
WHERE "id" IN (SELECT "studentId" FROM "enrollments" WHERE "status" = 'active');

UPDATE "students" SET "status" = 'ARCHIVED'
WHERE "status" = 'WAITING_LIST'
  AND "id" IN (SELECT "studentId" FROM "enrollments");

-- Seed one history event per student recording their current status.
INSERT INTO "student_status_events"
  ("id", "studentId", "fromStatus", "toStatus", "changedAt", "note")
SELECT gen_random_uuid()::text, "id", NULL, "status", "createdAt", 'Geïmporteerd'
FROM "students";

-- Migrate the old single paid amount into the payment ledger.
INSERT INTO "donation_payments"
  ("id", "studentId", "academicYearId", "amount", "paidAt", "note", "recordedById", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "studentId", "academicYearId", "paidAmount",
       COALESCE("paidAt", "createdAt"::date), "note", "recordedById", "createdAt", "updatedAt"
FROM "student_donations"
WHERE "paidAmount" > 0;

-- Log the migrated payments.
INSERT INTO "donation_payment_logs"
  ("id", "paymentId", "studentId", "academicYearId", "action", "amountAfter", "paidAtAfter", "note", "actorId", "createdAt")
SELECT gen_random_uuid()::text, p."id", p."studentId", p."academicYearId", 'CREATED',
       p."amount", p."paidAt", 'Geïmporteerd', p."recordedById", p."createdAt"
FROM "donation_payments" p;

-- ---------------------------------------------------------------------------
-- Drop the superseded single paid amount (now represented by payments)
-- ---------------------------------------------------------------------------
ALTER TABLE "student_donations" DROP COLUMN "paidAmount",
DROP COLUMN "paidAt";
