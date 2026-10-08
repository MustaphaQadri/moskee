-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_classId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_termId_fkey";

-- DropIndex
DROP INDEX "grades_academicYearId_idx";

-- DropIndex
DROP INDEX "grades_classId_academicYearId_idx";

-- DropIndex
DROP INDEX "grades_classId_termId_idx";

-- DropIndex
DROP INDEX "grades_studentId_subjectId_termId_academicYearId_key";

-- DropIndex
DROP INDEX "grades_subjectId_idx";

-- DropIndex
DROP INDEX "grades_termId_idx";

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "academicYearId",
DROP COLUMN "classId",
DROP COLUMN "subjectId",
DROP COLUMN "termId",
ADD COLUMN     "examId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 1,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_classId_termId_subjectId_idx" ON "exams"("classId", "termId", "subjectId");

-- CreateIndex
CREATE INDEX "exams_classId_academicYearId_idx" ON "exams"("classId", "academicYearId");

-- CreateIndex
CREATE INDEX "exams_subjectId_idx" ON "exams"("subjectId");

-- CreateIndex
CREATE INDEX "exams_termId_idx" ON "exams"("termId");

-- CreateIndex
CREATE INDEX "exams_academicYearId_idx" ON "exams"("academicYearId");

-- CreateIndex
CREATE INDEX "exams_recordedById_idx" ON "exams"("recordedById");

-- CreateIndex
CREATE INDEX "grades_examId_idx" ON "grades"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "grades_studentId_examId_key" ON "grades"("studentId", "examId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
