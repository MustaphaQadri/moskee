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
| Guardians/students reads   | `src/lib/guardians.ts`                                          |
| Lookup reads (levels/rooms/timeslots) | `src/lib/lookups.ts`                                 |
| Classes reads              | `src/lib/classes.ts`                                            |
| Student detail + comments  | `src/lib/students.ts`                                           |
| Action result helpers      | `src/lib/action-result.ts`                                      |
| Subjects/terms/grades reads| `src/lib/grades.ts`                                             |
| Donation reads             | `src/lib/donations.ts`                                          |
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
  **`Subject`**, **`Grade`**, **`DonationSetting`**, **`StudentDonation`**.

Key relations:

```
Level 1─* Subject 1─* Grade *─1 Student
Level 1─* SchoolClass 1─* Grade
Grade *─1 Term                       // global period definition
Grade *─1 AcademicYear               // scopes the grade to a school year
User 1─* Grade ("recordedBy")        // author of the score
SchoolClass 1─* Attendance           // presence, keyed by session + date
Student 1─* Attendance
ClassSession 1─* Attendance
Student 1─* StudentDonation *─1 AcademicYear   // yearly donation
User 1─* StudentDonation ("recordedBy")
DonationSetting                       // singleton global default amount
```

## Model notes

### ClassSession / timeslot (`class_sessions`)

A recurring weekend **timeslot** a class runs in — **not** an auth `Session` and
not a dated event. It holds a human `label` (e.g. `"Zaterdag ochtend"`), an
optional `day` (chosen from a fixed Dutch dropdown), and optional `startTime` /
`endTime` as `"HH:mm"` strings. There is no separate `period` (morning/noon/
afternoon) column anymore; the times are the source of truth. The 6 default
slots are created by `seed.ts` (Saturday/Sunday × morning/noon/afternoon).

### Guardian (`guardians`)

A parent/carer, linked to students through `StudentGuardian` (with a
`relation`). Besides name/email/phone/address it carries two optional, unique
identifiers from the subscription form: `donationNumber` and `educationNumber`
(unique only when present — Postgres allows many NULLs). Manager-only to read or
write (`requireManager`); students are created either during the guardian
subscription or from the guardian detail view, never on their own.

### Attendance (`attendance`)

Presence for one student, at one class meeting. A "meeting" is
`(class, session slot, date)` — note `ClassSession` is the recurring weekend slot
("Saturday morning"), **not** an auth `Session` and not a dated event, so the
date is stored on the row.

- `status`: `PRESENT | LATE | VERY_LATE | ABSENT | EXCUSED` (UI: Aanwezig, Te
  laat, Erg laat, Afwezig, Geoorloofd afwezig). Presence counts
  `PRESENT + LATE + VERY_LATE`.
- Unique `(studentId, classId, sessionId, date)` → marking a roster is an
  idempotent upsert.
- `date` is `@db.Date`; always normalize to UTC midnight via
  `parseDateOnly()` (`src/lib/dates.ts`) so the unique key is stable.
- `recordedById` is the staff member who last marked it.

### AcademicYear (`academic_years`)

A school year (`"2026-2027"`). `isCurrent` marks the active year; **at most one**
current year is enforced in `setCurrentAcademicYear()` (a transaction), not by
the DB. It no longer owns terms; it scopes grades and donations.

### Term (`terms`) — global period

A **global period** (UI says "Periode"/"Termijn") applied to every academic year.
The model is named `Term` to avoid confusing it with `ClassSession` timeslots.
Instead of concrete dates it stores a month range: `startMonth` / `endMonth`
(1–12). Terms do **not** cross the calendar-year boundary, so `endMonth >=
startMonth`.

- `name` and `sortOrder` are globally unique. `sortOrder` is 1-based.
- Concrete dates are derived per academic year from `startMonth` (first day) to
  `endMonth` (last day) — see `resolveTermDates()` in `src/lib/grades.ts`. The
  calendar year is chosen from the academic year's start/end month.
- Editing the periods applies to every year (there is no per-year term list).
- **Overlap is rejected** in `createTerm`/`updateTerm`: two month ranges must not
  intersect.

### Subject (`subjects`)

A subject **scoped to a level**: `"Math"` exists once per `Level` as a distinct
row. There is no global subject list and no `Subject ↔ Level` join — the level is
the relation. The grade's level therefore comes from the student's class.

- Unique `(levelId, name)`; names stay clean (no `math_l1` suffixes).
- `sortOrder` orders columns on the grade sheet; `isActive` hides retired
  subjects from new sheets.
- Optional `description` and `image` (a URL under `/uploads/subjects`, uploaded
  by a manager via `POST /api/uploads/subject-image`).
- Cross-level reporting (e.g. "average in Math across levels") is not supported
  by design; add a `SubjectFamily` later only if it becomes necessary.

### Grade (`grades`)

One student's score in one subject for one term **in one academic year**.

- `score Int?` — integer **1..10**; `null` means "not graded yet".
- `remark String?` — optional note (e.g. "absent", "excellent").
- Unique `(studentId, subjectId, termId, academicYearId)`. Since terms are
  global, `academicYearId` is what scopes the grade to a school year. `classId`
  is stored for context and authorization (one class per student per term is the
  working assumption).
- `recordedById` — staff member who last saved the score.
- Averages, ranks and report totals are **never stored** — they are computed on
  read in `src/lib/grades.ts`.

### DonationSetting (`donation_settings`)

A **singleton** row (`id = "default"`) holding the global default donation
amount (`Decimal(10,2)`). There is no per-year default — the default is global,
but each student's expected amount is snapshotted per year (see below).

### StudentDonation (`student_donations`)

One row per **student per year** — the yearly donation.

- `expectedAmount` — the amount to fulfil. Defaults from `DonationSetting` and is
  overridable (registration sets it; some families pay less). `0` = exempt.
- `paidAmount` — a single manually-updated value (no installments). Partial and
  overpayment are allowed.
- `category` — `FULL | REDUCED | EXEMPT` (classification of the expectation).
- `paidAt`, `note`, `recordedById` — optional metadata.
- Unique `(studentId, academicYearId)`.
- Balance and status are **derived on read**:
  `balance = expectedAmount − paidAmount`,
  `status = EXEMPT` (expected ≤ 0) · `PAID` (paid ≥ expected) ·
  `PARTIAL` (paid > 0) · `UNPAID`.
- Reports left-join this row, so students without one fall back to the global
  default / `FULL` / `0` — rows do not need to be pre-created.

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
7. Donation amounts are non-negative `Decimal(10,2)`; `expectedAmount` defaults
   to the global setting when omitted.
8. Donations are manager-only (`requireManager`).

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
| `Grade → AcademicYear`       | Restrict  | A year with grades cannot be deleted           |
| `Attendance → ClassSession`  | Restrict  | Lookup deletion must not wipe history          |
| `Attendance → Class`/`Student`| Cascade  | Mirrors grades                                 |
| `Subject → Level`            | Restrict  | Can't drop a level that still has subjects     |
| `StudentDonation → Student`  | Cascade   | Removing a student removes their donation rows |
| `StudentDonation → AcademicYear` | Restrict | Financial history; can't delete a year with donations |
| `StudentDonation → User`     | SetNull   | Keep the record if the recorder is removed     |

Actions pre-check grade/donation counts and throw friendly errors before relying
on the DB `Restrict`.

## Reports (`src/lib/grades.ts`, read-only)

- **`getClassGradeSheet({ classId, termId, academicYearId })`** — roster (active
  enrollments) × level subjects, with existing `score`/`remark` per cell. The
  grid for entry.
- **`getStudentPeriodReport({ studentId, termId, academicYearId })`** — one row
  per level subject with `score`/`remark`, `average` (mean of graded subjects),
  `gradedCount`, `rank`/`classSize` within the class, and an attendance summary
  scoped to the term's dates for that year.
- **`getStudentYearlyReport({ studentId, academicYearId })`** — the global terms
  in order; per subject the term scores plus a per-subject `average`;
  `overallAverage` (equal weight per subject); attendance spanning the year's
  resolved term bounds.

Term dates are computed by `resolveTermDates(term, academicYear)` (first day of
`startMonth` → last day of `endMonth`, in the calendar year the term falls in for
that academic year).

Averaging rules:

- Means ignore `null` scores.
- `rank` is **competition ranking** (ties share a position): count of students
  with a strictly higher class average, +1. Only computed when the student has
  an average.
- `presenceRate = (PRESENT + LATE + VERY_LATE) / total`.
- Attendance in a report is `null` when the term/year has no date bounds.

The student's class is resolved from their grades for the term, falling back to
their most recent active enrollment (see `resolveReportClass`).

## Donation reports (`src/lib/donations.ts`, read-only)

- **`getDonationSetting()`** — the global default amount (0 if unset).
- **`getStudentDonation({ studentId, academicYearId })`** — one student's row.
- **`getDonationReport({ academicYearId, classId? })`** — who paid and who
  didn't: rows per student (all students, or active enrollments of `classId`)
  with `expectedAmount`, `paidAmount`, `balance`, `category`, `status`, `paidAt`,
  `note`; plus `totals` (expected, collected, outstanding, and counts per
  status). Outstanding excludes exempt students (it sums only positive
  balances). `Decimal` values are returned as `number`.

## Operational notes / gotchas

- **Migration timestamps**: the original `init` migration was future-dated,
  which made newer migrations sort before it and broke the shadow database.
  Timestamps were normalized to real apply order
  (`init` → `add_attendance` → `add_grades_subjects` → `add_donations`). Keep
  migration folder timestamps monotonically increasing.
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
- **Donations in registration**: the registration flow (not built) should call
  `setStudentDonation` with an overridden `expectedAmount`, defaulting to the
  global setting.
- **Donation payment history**: currently a single `paidAmount` per student/year.
  Move to a payments table if installments/audit are needed.
