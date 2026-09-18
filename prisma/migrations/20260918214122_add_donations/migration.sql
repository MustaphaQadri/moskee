-- CreateEnum
CREATE TYPE "DonationCategory" AS ENUM ('FULL', 'REDUCED', 'EXEMPT');

-- CreateTable
CREATE TABLE "donation_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_donations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "category" "DonationCategory" NOT NULL DEFAULT 'FULL',
    "paidAt" DATE,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_donations_academicYearId_idx" ON "student_donations"("academicYearId");

-- CreateIndex
CREATE INDEX "student_donations_recordedById_idx" ON "student_donations"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "student_donations_studentId_academicYearId_key" ON "student_donations"("studentId", "academicYearId");

-- AddForeignKey
ALTER TABLE "student_donations" ADD CONSTRAINT "student_donations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_donations" ADD CONSTRAINT "student_donations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_donations" ADD CONSTRAINT "student_donations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
