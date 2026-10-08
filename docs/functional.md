# Functional overview

What Moskee does, in product terms. This is the companion to
[`domain-model.md`](./domain-model.md) (technical/data model) and
[`AGENTS.md`](../AGENTS.md) (stack + conventions).

> **Status.** Built: authentication; dashboard shell; subscriptions
> (guardians/students); staff management; a Beheer screen for levels, rooms,
> subjects, timeslots, academic years and periods;
> and classes (grid, detail, enroll/move students, per-student comments).
> **Attendance** has a UI (per-meeting sheet and student summaries); **grades**
> have exams, a per-exam entry sheet, and period report cards under the class's
> **Cijfers** button. The donations UI is still not built.

## Purpose

Moskee manages a small weekend school:

- classes, levels, rooms and the weekend session slots they run in;
- students and their guardians (parents/carers);
- attendance per class meeting;
- exams and grades per period, with period report cards;
- yearly donations per student, and who has paid.

## Roles & access

| Role        | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| **Manager** | Full access. Manages classes, students, guardians, staff, lookups, grades, and all donation/financial data. |
| **Teacher** | Views and manages **their own classes only** — attendance and grades for the classes they teach. |

- Staff accounts are created by a manager; self-signup is disabled. The first
  manager is bootstrapped with `pnpm db:seed`.
- Students and guardians do **not** have accounts.
- Donations are **manager-only** (financial data).
- Every write re-checks the role and class ownership on the server; the UI is
  never trusted.

## Core concepts

| Term                | Meaning                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **Level**           | A teaching level ("Beginners", "Group 1").                              |
| **Class**           | A group of students taught at a level, optionally in a room by a teacher. |
| **Session slot**    | A recurring weekend timeslot: a day (from a fixed Dutch dropdown) plus a start and end time. |
| **Meeting**         | A dated occurrence of a class in a session slot — `(class, slot, date)`. |
| **Academic year**   | e.g. "2026-2027"; scopes the exams and donations. One is current.      |
| **Term / Period**   | A recurring period defined by months (e.g. Sept–Dec), shared by every year. |
| **Subject**         | A subject offered at a level ("Math"); the same name exists once per level. |
| **Enrollment**      | The link between a student and a class, with start/end dates and status. |
| **Exam**            | One test for a class + subject + period + year; a teacher can add several per subject per period. |
| **Grade**           | A student's score on one exam (1–10, or blank).                          |
| **Donation**        | A yearly amount a family is expected to give for a student.             |

## Features

### 1. Students & guardians

- A **student** has first/last name, optional sex (boy/girl), date of birth, and
  an optional **photo** (added during enrollment; shown in the student detail,
  the enrollment overview, and class rosters).
- A **guardian** has first/last name, optional email, phone, and address.
- Students and guardians are linked many-to-many; each link records the
  **relation** ("mother", "father", "aunt", …). A guardian can be related
  differently to different children.
- Managers can edit a student's own data (name, sex, date of birth, photo)
  directly from the student detail page, using the same fields as enrollment.
- Both students and guardians can carry free-text comments from staff.
- The **Inschrijvingen** overview has two tabs: **Ouders/verzorgers** (guardian
  list) and **Leerlingen** (student list, showing each student's class and
  linked guardians).

### 2. Classes & scheduling

- A class belongs to a **level** (required), and may have a **room** and a
  **teacher**.
- A class runs in **one or more session slots** (e.g. Saturday morning *and*
  Sunday noon). Each slot has a day, a start time and an end time.
- Rooms have an optional capacity and an optional description.
- Levels and rooms are managed lists.

### 3. Enrollment

- A student is enrolled in a class with a start date, optional end date, and a
  status of **active** or **withdrawn**.
- Only **active** enrollments appear on rosters and can be marked/graded.
- Working assumption: **one class per student per term** (a class teaches all
  subjects for its level).
- In a class, a manager can select multiple students and **move** them to
  another class, or **remove** them from the class (they are left without a
  class). Both actions ask for confirmation first.

### 4. Attendance

- Attendance is taken per **meeting**: a class, a session slot, and a date.
- From a class, **Aanwezigheid** opens the sheet for a chosen **tijdslot** and
  **datum**. The closest meeting date (current day when it matches, otherwise
  the nearest) and its timeslot are preselected.
- Each student is marked **Aanwezig**, **Te laat**, **Erg laat**, **Afwezig**, or
  **Geoorloofd afwezig**; **Aanwezig** is preselected. An optional **note** can
  be added per student (shown on the student detail's absence list).
- Re-saving a roster updates existing marks instead of duplicating them.
- Teachers may take attendance only for their own classes; managers for any.
- The sheet shows a **pie chart** (with the total in the centre) of the current
  meeting's breakdown. The student detail shows attendance **per period**: the
  current period's pie chart and non-present days by default, with a list of all
  periods to switch between.
- Presence rate for a period = `(Aanwezig + Te laat + Erg laat) / total marks`.

### 5. Academic years & terms

- Each **academic year** scopes the grades (and donations) recorded in it;
  exactly one year is marked **current**.
- A **term / period** (labelled "Periode" in the UI) is defined **once, globally**
  — name, order, and a month range (start month → end month). The same periods
  apply to every academic year; there is no per-year list to maintain.
- A period starts on the **first day of its start month** and ends on the **last
  day of its end month**; periods never cross the calendar-year boundary.
- The concrete dates are derived per academic year and are what let reports count
  attendance for that period.
- Periods may **not overlap** — the management screen rejects an overlapping
  month range.

### 6. Subjects

- Subjects are defined **per level**: "Math" exists once at each level as its own
  subject. A class studies the subjects of its level.
- A subject has an optional **description** and an optional **image** (uploaded
  by a manager).
- Subjects have an order (exams are grouped/listed by subject) and an **active**
  flag to retire them without deleting history.
- A subject that already has exams cannot be deleted.

### 7. Exams & grades

- An **exam** is one test for a class, a **subject**, a **period** and a
  **school year**. A teacher can add **several exams per subject per period**
  (e.g. "Toets 1" and "Toets 2" in the same period).
- An exam has a **name** the teacher fills in (e.g. "Hoofdstuk 1"), a **date** and
  a **coefficient** (weight ≥ 1, default 1) used when averaging.
- From a class, **Cijfers** opens the exams for a chosen **schooljaar**, **periode**
  and (optionally) **vak**. There the teacher can add a toets and open it.
- Grades are entered **like attendance**: the active roster is shown as rows and
  each student's grade is picked from a **segmented control** of `—` and 1–10,
  with an optional remark; one **Opslaan** saves the whole sheet.
- The exam's subject must belong to the class's level, and the student must be
  actively enrolled. Teachers edit only their own classes.
- Averages, ranks and totals are **computed when a report is viewed**, never
  stored, so they can't drift from the underlying scores.

### 8. Reports

**Period report card (per class, per period)**

- A table of the class: each student (rows) against the level's subjects
  (columns), showing the **subject average** for the period, the student's
  **overall average**, their **rank** in the class, and their **attendance**.
- Opening a student shows their **report card**: for each subject (as a header)
  the exams are listed underneath with the **name**, **date** and the student's
  **grade**, followed by the subject's **average**; plus overall average, rank,
  and an attendance **pie chart** with the counts for the period.

**Printable report (per student, per period)**

- A print-friendly **A4** page (browser print / "save as PDF") intended to hand
  to the student, reachable from the report card.
- It shows **only the subject averages** (the per-exam detail stays on the period
  report), the overall average, and the attendance **pie chart**. No rank, no
  signature block.

**Year report (per class, end of the school year)**

- A class overview table of the **subject year averages**, the overall average,
  rank and whole-year attendance per student.
- Opening a student shows their year card: for each subject the **three period
  averages** (P1 · P2 · P3) and the **year average**, the overall average, and an
  attendance pie chart for the whole year.
- A printable **A4 year report** (per student) shows the per-subject period and
  year averages, the overall average and the attendance pie chart only (no
  exams, no rank, no signatures).

Averaging rules:

- A subject's period average = **coefficient-weighted mean** of that subject's
  exam scores (`Σ(score × coefficient) / Σ(coefficient)`); blanks are ignored.
- A subject's **year average** = mean of its non-null period averages.
- Overall average = mean of the subjects that have at least one score.
- Rank uses competition ranking (ties share a position).

Grades are **colour-coded green → red** in the reports and the entry sheet;
**5.5** is the minimal passing grade (below that is failing).

**Report observations**

- On each student report (period and year) the teacher/manager can write a
  free-text **observation** ("Opmerking" / "ملاحظة") for that student. It is saved
  per period or per year and appears on the report and on the printed A4, inside
  a bordered frame.
- Pressing **Afdrukbaar rapport** warns first when no observation has been
  written.

**Printing**

- **Alle rapporten afdrukken** on a class report prints every student's report,
  one A4 page each. If some students have no observation, a wizard walks through
  them: it shows a **responsive preview** of each report and offers a textarea to
  fill the observation (with skip) before printing.
- The printed reports use **bilingual labels (Dutch + Arabic)**; the text
  (student, subjects, observation) is shown as entered.

### 9. Donations

- A single **global default amount** is configured centrally (one value, not
  per year).
- Each student has an **expected amount per year**. It starts from the global
  default and can be overridden — some families pay less, some nothing.
  The override is set during registration (or later) and can be classified as
  **Full**, **Reduced**, or **Exempt** (`0`).
- A single **paid amount** is recorded per student per year (partial and
  overpayment allowed), with an optional payment date and note. There are no
  installments.
- **Status** is derived from `expected − paid`:
  - **Exempt** — expected is 0;
  - **Paid** — paid ≥ expected;
  - **Partial** — something paid but less than expected;
  - **Unpaid** — nothing paid.
- The **donation report** shows, per student for a year (optionally filtered to a
  class): expected, paid, balance, category and status, plus totals (expected,
  collected, outstanding) and counts per status. Students without a donation row
  are shown with the global default and "unpaid".

## Business rules (plain language)

1. Teachers act only on classes they teach; managers act anywhere.
2. Only actively enrolled students are marked or graded.
3. An exam's subject must belong to the class's level.
4. Scores are 1–10 or blank; donations are non-negative amounts (2 decimals,
   single currency).
5. A period or subject that already has exams, or a year with exams or
   donations, cannot be deleted — history is protected. Periods must not overlap.
6. At most one academic year is current.
7. Donation amounts and payments are manager-only.

## Not built yet / roadmap

- **UI pages**: sign-in, dashboards, class/student/guardian management,
  attendance, exams/grade entry, and period report cards exist. The **donations**
  UI is not built.
- **Registration flow**: should set the student's expected donation (defaulting
  to the global amount) when a student is enrolled.
- **Report export**: printable A4 report cards exist (browser print). A generated
  PDF file (not just print-to-PDF) is still not built.
- **Frozen report cards**: reports are live; persist snapshots only if published
  reports must not change retroactively.
- **Donation installments / audit**: replace the single paid value with a
  payments table if needed.
- **Cross-level subject reporting** and **teacher-per-subject** if the school
  grows into needing them.

## Glossary of derived values

| Value            | Formula / rule                                             |
| ---------------- | ---------------------------------------------------------- |
| Subject average  | coefficient-weighted mean of the subject's exam scores     |
| Year subject avg | mean of the subject's non-null period averages             |
| Overall avg      | mean of the per-subject averages (blank subjects ignored)  |
| Rank             | 1 + number of classmates with a strictly higher average    |
| Presence rate    | `(Present + Late + Very late) / total attendance marks`    |
| Donation balance | `expectedAmount − paidAmount`                              |
| Donation status  | Exempt / Paid / Partial / Unpaid (see above)               |
