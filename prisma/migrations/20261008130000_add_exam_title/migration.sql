-- AlterTable: add the teacher-chosen exam title. Existing exams are backfilled
-- with the previously derived label (subject · period · year).
ALTER TABLE "exams" ADD COLUMN "title" TEXT;

UPDATE "exams" e
SET "title" = s."name" || ' · ' || t."name" || ' · ' || y."name"
FROM "subjects" s, "terms" t, "academic_years" y
WHERE e."subjectId" = s."id"
  AND e."termId" = t."id"
  AND e."academicYearId" = y."id";

UPDATE "exams" SET "title" = 'Toets' WHERE "title" IS NULL;

ALTER TABLE "exams" ALTER COLUMN "title" SET NOT NULL;
