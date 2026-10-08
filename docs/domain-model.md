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
  **`Subject`**, **`Exam`**, **`Grade`**, **`PeriodReportObservation`**,
  **`YearReportObservation`**, **`DonationSetting`**, **`StudentDonation`**.

Key relations:

```
Level 1─* Subject 1─* Exam 1─* Grade *─1 Student
Level 1─* SchoolClass 1─* Exam 1─* Grade
Exam *─1 Term                        // global period definition
Exam *─1 AcademicYear                // scopes the exam to a school year
Student 1─* PeriodReportObservation *─1 Term
Student 1─* YearReportObservation *─1 AcademicYear
User 1─* Exam ("recordedBy")         // author of the exam
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
- `sortOrder` orders the exams list; `isActive` hides retired subjects from new
  exams.
- Optional `description` and `image` (a URL under `/uploads/subjects`, uploaded
  by a manager via `POST /api/uploads/subject-image`).
- Cross-level reporting (e.g. "average in Math across levels") is not supported
  by design; add a `SubjectFamily` later only if it becomes necessary.

### Exam (`exams`)

One test for one **class + subject + period + academic year**. A teacher can add
several exams per subject per period.

- `date @db.Date` — normalized to UTC midnight via `parseDateOnly()`.
- `title String` — free label chosen by the teacher (e.g. "Hoofdstuk 1"), shown
  in the exams list, the entry sheet and the period report.
- `coefficient Int` (≥ 1, default 1) — weight of the exam in the subject's period
  average. An exam with coefficient 2 counts twice.
- `subject` must belong to the class's level (`assertSubjectBelongsToClassLevel`).
- `recordedById` — staff member who created the exam.

### Grade (`grades`)

One student's score on one exam.

- `score Int?` — integer **1..10**; `null` means "not graded yet".
- `remark String?` — optional note (e.g. "absent", "excellent").
- Unique `(studentId, examId)` — re-saving an exam sheet is an idempotent upsert.
- `recordedById` — staff member who last saved the score.
- A roster row is created for every **active** enrollment; a student can be left
  blank (not graded) for an exam.
- Averages, ranks and report totals are **never stored** — they are computed on
  read in `src/lib/grades.ts`.

### Report observations (`period_report_observations`, `year_report_observations`)

Free text ("Opmerking" / "ملاحظة") the teacher (or manager) leaves for a student
on a report; shown on the on-screen report and on the printed A4 report.

- **`PeriodReportObservation`** — one per student per period: unique
  `(studentId, termId, academicYearId)`.
- **`YearReportObservation`** — one per student per year: unique
  `(studentId, academicYearId)`.
- `body` up to 2000 chars; saving an empty body **deletes** the row.
- Written by `savePeriodReportObservation` / `saveYearReportObservation`
  (`src/app/actions/report-observations.ts`), which re-check class authorization
  and active enrollment.

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
3. An exam's subject must belong to the class's level
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
| `Exam → Term`                | Restrict  | Exams are history; can't delete a term with exams |
| `Exam → Subject`             | Restrict  | Same                                           |
| `Exam → AcademicYear`        | Restrict  | A year with exams cannot be deleted            |
| `Exam → Class`               | Cascade   | Removing the class removes its exams           |
| `Grade → Exam`               | Cascade   | Removing an exam removes its scores            |
| `Grade → Student`            | Cascade   | Removing the parent removes its records        |
| `PeriodReportObservation → Student`/`Term`/`AcademicYear` | Cascade | Annotation, not history |
| `YearReportObservation → Student`/`AcademicYear` | Cascade | Annotation, not history |
| `Attendance → ClassSession`  | Restrict  | Lookup deletion must not wipe history          |
| `Attendance → Class`/`Student`| Cascade  | Mirrors grades                                 |
| `Subject → Level`            | Restrict  | Can't drop a level that still has subjects     |
| `StudentDonation → Student`  | Cascade   | Removing a student removes their donation rows |
| `StudentDonation → AcademicYear` | Restrict | Financial history; can't delete a year with donations |
| `StudentDonation → User`     | SetNull   | Keep the record if the recorder is removed     |

Actions pre-check exam/donation counts and throw friendly errors before relying
on the DB `Restrict`.

## Reports (`src/lib/grades.ts`, read-only)

- **`listExams({ classId, termId, academicYearId, subjectId? })`** — exams for a
  class/period/year (optionally one subject) with title, date, coefficient and
  graded count.
- **`getExamGradeSheet({ examId })`** — the exam meta plus the active roster with
  each student's `score`/`remark` (`null` = not graded). Backs the entry sheet.
- **`getStudentPeriodReport({ studentId, termId, academicYearId })`** — per
  subject: its exams (`title`, `date`, `coefficient`, `score`) and a
  coefficient-weighted `average`; plus `overallAverage` (mean of the per-subject
  averages), `rank`/`classSize` within the class, and an attendance summary
  scoped to the term's dates for that year.
- **`getClassPeriodReport({ classId, termId, academicYearId })`** — the same
  numbers for every student, as a subjects × students table (subject averages,
  overall average, rank, attendance). Backs the class report card.
- **`getStudentYearReport({ studentId, academicYearId })`** — for every subject
  the three period averages and the **year average** (mean of the non-null
  period averages), the `overallAverage`, `classSize`, and attendance across the
  whole year (earliest period start → latest period end).
- **`getClassYearReport({ classId, academicYearId })`** — the year averages for
  every student as a subjects × students table (subject year averages, overall
  average, rank, whole-year attendance). Backs the class year overview.

Every student report DTO also carries `observation` (the teacher's note for that
period/year). The printable A4 reports (`src/app/print/...`) are **bilingual**
(NL + AR fixed labels) and include the observation in a bordered frame; a
class-wide bulk route prints one A4 page per student.

Term dates are computed by `resolveTermDates(term, academicYear)` (first day of
`startMonth` → last day of `endMonth`, in the calendar year the term falls in for
that academic year).

Averaging rules:

- A subject's period average is the **coefficient-weighted mean** of its exams'
  non-null scores: `Σ(score × coefficient) / Σ(coefficient)`.
- A subject's **year average** is the unweighted mean of its non-null period
  averages.
- A student's overall average is the unweighted mean of their per-subject
  averages (subjects with no graded exam are ignored).
- `rank` is **competition ranking** (ties share a position): count of students
  with a strictly higher overall average, +1. Only computed when the student has
  an average.
- `presenceRate = (PRESENT + LATE + VERY_LATE) / total`.
- Attendance in a report is `null` when the term/year has no date bounds.

The student's class is resolved from an exam they are graded on for the
term/year, falling back to their most recent active enrollment (see
`resolveReportClass` / `resolveReportClassForYear`).

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

- **UI**: attendance, grade entry (exams) and period report cards have pages
  under `/dashboard/classes/[id]`. The donation UI is still not built.
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
