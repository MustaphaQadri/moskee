-- Remove the "primary guardian" flag from the student<->guardian link.
ALTER TABLE "student_guardians" DROP COLUMN "isPrimary";

-- Remove 'OTHER' from the Sex enum. Postgres cannot drop a single enum value,
-- so rebuild the type: clear any existing rows first, then swap the type.
UPDATE "students" SET "sex" = NULL WHERE "sex" = 'OTHER';
ALTER TYPE "Sex" RENAME TO "Sex_old";
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');
ALTER TABLE "students" ALTER COLUMN "sex" TYPE "Sex" USING "sex"::text::"Sex";
DROP TYPE "Sex_old";
