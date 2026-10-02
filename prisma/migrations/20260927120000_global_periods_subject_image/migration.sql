-- Subjects gain an optional description and image.
ALTER TABLE "subjects" ADD COLUMN "description" TEXT;
ALTER TABLE "subjects" ADD COLUMN "image" TEXT;

-- Terms become global period definitions scoped by month numbers. Add the month
-- columns nullable, backfill them from the existing date bounds, then drop the
-- old per-year columns. The UPDATE runs before the SET NOT NULL so existing rows
-- stay valid.
ALTER TABLE "terms" ADD COLUMN "startMonth" INTEGER;
ALTER TABLE "terms" ADD COLUMN "endMonth" INTEGER;
UPDATE "terms"
SET "startMonth" = EXTRACT(MONTH FROM "startDate")::integer,
    "endMonth" = EXTRACT(MONTH FROM "endDate")::integer;
ALTER TABLE "terms" ALTER COLUMN "startMonth" SET NOT NULL;
ALTER TABLE "terms" ALTER COLUMN "endMonth" SET NOT NULL;

DROP INDEX "terms_academicYearId_name_key";
DROP INDEX "terms_academicYearId_sortOrder_key";
DROP INDEX "terms_academicYearId_idx";
ALTER TABLE "terms" DROP CONSTRAINT "terms_academicYearId_fkey";
ALTER TABLE "terms" DROP COLUMN "academicYearId";
ALTER TABLE "terms" DROP COLUMN "startDate";
ALTER TABLE "terms" DROP COLUMN "endDate";
CREATE UNIQUE INDEX "terms_name_key" ON "terms"("name");
CREATE UNIQUE INDEX "terms_sortOrder_key" ON "terms"("sortOrder");

-- Grades are scoped to an academic year instead of through their term. The
-- table is empty, so the new required column can be added directly.
ALTER TABLE "grades" ADD COLUMN "academicYearId" TEXT NOT NULL;
CREATE INDEX "grades_classId_academicYearId_idx" ON "grades"("classId", "academicYearId");
CREATE INDEX "grades_academicYearId_idx" ON "grades"("academicYearId");
DROP INDEX "grades_studentId_subjectId_termId_key";
CREATE UNIQUE INDEX "grades_studentId_subjectId_termId_academicYearId_key" ON "grades"("studentId", "subjectId", "termId", "academicYearId");
ALTER TABLE "grades" ADD CONSTRAINT "grades_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
