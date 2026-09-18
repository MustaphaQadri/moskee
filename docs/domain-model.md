# Domain model & tech notes

Running notes on the school domain so a future session can get up to speed
quickly. Read [`AGENTS.md`](../AGENTS.md) first for the stack and the
version-specific gotchas (Next 16, Mantine 9, Better Auth 1.7, Prisma 7). The
visual schema lives in [`erd.md`](./erd.md) / [`erd.mmd`](./erd.mmd).

## Where things live

| Concern                    | Location                                                        |
| -------------------------- | --------------------------------------------------------------- |
| Schema + migrations        | `prisma/schema.prisma`, `prisma/migrations/`                    |
| Prisma client singleton    | `src/lib/prisma.ts`                                             |
| Session/role checks (DAL)  | `src/lib/dal.ts`                                                |
| Shared action guards       | `src/lib/authorization.ts`                                      |
| Date-only helpers          | `src/lib/dates.ts`                                              |
| Attendance reads           | `src/lib/attendance.ts`                                         |
| Subjects/terms/grades reads| `src/lib/grades.ts`                                             |
| Server Actions             | `src/app/actions/*.ts`                                          |

Reads are `server-only` modules; writes are `"use server"` actions. Both
validate and re-check authorization. Client Components must not import the
`server-only` modules.

## Entity map

Two groups of tables:

- **Auth (Better Auth)**: `User`, `Session`, `Account`, `Verification`. `User`
  also carries the app `role` (`manager` | `teacher`) and `phone`. Teachers are
  just `User` rows with `role = "teacher"`.
- **School domain**: `Student`, `Guardian`, `StudentGuardian`, `Room`, `Level`,
  `ClassSession`, `SchoolClass`, `SchoolClassSession`, `Enrollment`, the three
  `*Comment` tables, plus **`Attendance`**, **`AcademicYear`**, **`Term`**,
  **`Subject`**, **`Grade`**.

Key relations:

```
Level 1─* Subject 1─* Grade *─1 Student
Level 1─* SchoolClass 1─* Grade
AcademicYear 1─* Term 1─* Grade
User 1─* Grade ("recordedBy")        // author of the score
SchoolClass 1─* Attendance           // presence, keyed by session + date
Student 1─* Attendance
ClassSession 1─* Attendance
```

## Model notes

### Attendance (`attendance`)

Presence for one student, at one class meeting. A "meeting" is
`(class, session slot, date)` — note `ClassSession` is the recurring weekend slot
("Saturday morning"), **not** an auth `Session` and not a dated event, so the
date is stored on the row.

- `status`: `PRESENT | ABSENT | LATE | EXCUSED`.
- Unique `(studentId, classId, sessionId, date)` → marking a roster is an
  idempotent upsert.
- `date` is `@db.Date`; always normalize to UTC midnight via
  `parseDateOnly()` (`src/lib/dates.ts`) so the unique key is stable.
- `recordedById` is the staff member who last marked it.

### AcademicYear (`academic_years`)

A school year (`"2026-2027"`). `isCurrent` marks the active year; **at most one**
current year is enforced in `setCurrentAcademicYear()` (a transaction), not by
the DB.

### Term (`terms`)

A period within a year (UI says "Period"). The model is named `Term` to avoid
colliding with `ClassSession.period` (time-of-day). Exactly the fields a report
needs: `name`, `sortOrder`, and optional `startDate`/`endDate` used to scope
attendance to the term.

- Unique `(academicYearId, name)` and `(academicYearId, sortOrder)`.
- `sortOrder` is 1-based; `reorderTerms()` uses a two-pass (negative, then final)
  update to avoid transiently violating the unique constraint.

### Subject (`subjects`)

A subject **scoped to a level**: `"Math"` exists once per `Level` as a distinct
row. There is no global subject list and no `Subject ↔ Level` join — the level is
the relation. The grade's level therefore comes from the student's class.

- Unique `(levelId, name)`; names stay clean (no `math_l1` suffixes).
- `sortOrder` orders columns on the grade sheet; `isActive` hides retired
  subjects from new sheets.
- Cross-level reporting (e.g. "average in Math across levels") is not supported
  by design; add a `SubjectFamily` later only if it becomes necessary.

### Grade (`grades`)

One student's score in one subject for one term.

- `score Int?` — integer **1..10**; `null` means "not graded yet".
- `remark String?` — optional note (e.g. "absent", "excellent").
- Unique `(studentId, subjectId, termId)`. `classId` is stored for context and
  authorization (one class per student per term is the working assumption).
- `recordedById` — staff member who last saved the score.
- Averages, ranks and report totals are **never stored** — they are computed on
  read in `src/lib/grades.ts`.

## Invariants (enforced in actions, not the DB)

1. A teacher may only write attendance/grades for classes where
   `SchoolClass.teacherId === user.id`; managers can write anywhere
   (`assertCanManageClass`).
2. Students being marked/graded must have an **active** `Enrollment` in the class
   (`assertActiveEnrollments`).
3. A grade's subject must belong to the class's level
   (`subject.levelId === class.levelId`).
4. Attendance session must be linked to the class (`SchoolClassSession`).
5. At most one `AcademicYear.isCurrent = true`.
6. `score` is `1..10` or null; `remark` ≤ 500 chars.

## Authorization

- `src/lib/dal.ts`: `getSession`, `getCurrentUser`, `requireSession`,
  `requireRole(...roles)`. Redirects unauthenticated users to `/sign-in` and
  unauthorized users to `/`.
- `src/lib/authorization.ts`: `requireStaff()` (manager|teacher, returns
  `{ userId, isTeacher }`), `requireManager()`, `assertCanManageClass()`,
  `assertActiveEnrollments()`.
- **Never** rely on client-side role checks; every action re-verifies.

## Deletion semantics

| Relation                     | On delete | Why                                            |
| ---------------------------- | --------- | ---------------------------------------------- |
| `Grade → Term`               | Restrict  | Grades are history; can't delete a graded term |
| `Grade → Subject`            | Restrict  | Same                                           |
| `Grade → Student`/`Class`    | Cascade   | Removing the parent removes its records        |
| `Term → AcademicYear`        | Cascade   | A year owns its terms                          |
| `Attendance → ClassSession`  | Restrict  | Lookup deletion must not wipe history          |
| `Attendance → Class`/`Student`| Cascade  | Mirrors grades                                 |
| `Subject → Level`            | Restrict  | Can't drop a level that still has subjects     |

Actions pre-check grade counts and throw friendly errors before relying on the
DB `Restrict`.

## Reports (`src/lib/grades.ts`, read-only)

- **`getClassGradeSheet({ classId, termId })`** — roster (active enrollments) ×
  level subjects, with existing `score`/`remark` per cell. The grid for entry.
- **`getStudentPeriodReport({ studentId, termId })`** — one row per level
  subject with `score`/`remark`, `average` (mean of graded subjects),
  `gradedCount`, `rank`/`classSize` within the class, and an attendance summary
  scoped to the term's date bounds.
- **`getStudentYearlyReport({ studentId, academicYearId })`** — terms in order;
  per subject the term scores plus a per-subject `average`; `overallAverage`
  (equal weight per subject); attendance spanning the year's term bounds.

Averaging rules:

- Means ignore `null` scores.
- `rank` is **competition ranking** (ties share a position): count of students
  with a strictly higher class average, +1. Only computed when the student has
  an average.
- `presenceRate = (PRESENT + LATE) / total`.
- Attendance in a report is `null` when the term/year has no date bounds.

The student's class is resolved from their grades for the term, falling back to
their most recent active enrollment (see `resolveReportClass`).

## Operational notes / gotchas

- **Migration timestamps**: the original `init` migration was future-dated,
  which made newer migrations sort before it and broke the shadow database.
  Timestamps were normalized to real apply order
  (`init` → `add_attendance` → `add_grades_subjects`). Keep migration folder
  timestamps monotonically increasing.
- **Creating migrations**: `pnpm db:migrate -- --name x` drops into an
  interactive prompt because the extra `--` is passed through. Use
  `pnpm exec prisma migrate dev --name x` instead.
- Always `pnpm db:generate` after editing the schema (Prisma 7 does not
  auto-generate).
- Run `pnpm lint` and `pnpm typecheck` after changes. The generated Prisma client
  is `@ts-nocheck`, but our code is not.
- For throwaway DB smoke scripts, run with
  `NODE_OPTIONS="--conditions=react-server" pnpm tsx <script>` (needed for
  `server-only` imports) and `import "dotenv/config"` first (the runtime doesn't
  auto-load `.env`).

## Open items / next steps

- **UI**: no pages/routes exist yet for attendance, grade entry, or reports.
  When they land, add `revalidatePath` calls to the actions.
- **Report snapshots**: reports are computed live. Add persisted report cards
  (frozen per term) only if published reports must not change retroactively.
- **PDF/print export** for period and yearly reports.
- **Subject families** if cross-level subject aggregation is ever needed.
- **Teacher per subject** (a `ClassSubject`/assignment table) if one class
  teacher stops being enough; grade authorization would move to that table.
