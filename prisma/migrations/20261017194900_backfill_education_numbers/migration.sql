-- Backfill the automatically assigned education number for existing guardians.
-- Each guardian receives the smallest positive integer that is not used yet;
-- non-numeric legacy values are ignored. New guardians get their number in the
-- application layer (pickNextEducationNumber).
WITH used AS (
  SELECT DISTINCT "educationNumber"::int AS n
  FROM "guardians"
  WHERE "educationNumber" ~ '^[0-9]+$'
),
targets AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS rn
  FROM "guardians"
  WHERE "educationNumber" IS NULL
),
candidates AS (
  SELECT s AS n, row_number() OVER (ORDER BY s) AS rn
  FROM generate_series(
    1,
    (SELECT COALESCE(MAX(n), 0) FROM used) + (SELECT COUNT(*) FROM targets) + 1
  ) AS s
  WHERE s NOT IN (SELECT n FROM used)
),
assignment AS (
  SELECT t.id, c.n
  FROM targets t
  JOIN candidates c ON c.rn = t.rn
)
UPDATE "guardians" g
SET "educationNumber" = a.n::text
FROM assignment a
WHERE g.id = a.id;
