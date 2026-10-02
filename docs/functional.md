# Functional overview

What Moskee does, in product terms. This is the companion to
[`domain-model.md`](./domain-model.md) (technical/data model) and
[`AGENTS.md`](../AGENTS.md) (stack + conventions).

> **Status.** Built: authentication; dashboard shell; subscriptions
> (guardians/students); staff management; a Beheer screen for levels, rooms,
> subjects, timeslots, academic years and periods;
> and classes (grid, detail, enroll/move students, per-student comments).
> **Attendance** has a UI (per-meeting sheet and student summaries); grades still
> only have a data layer and actions (**no UI yet**, its button on the class
> detail is disabled). Reports and donations UI are also not built. This document
> describes the intended behaviour those pages will expose.

## Purpose

Moskee manages a small weekend school:

- classes, levels, rooms and the weekend session slots they run in;
- students and their guardians (parents/carers);
- attendance per class meeting;
- subjects and grades per term, with period and yearly reports;
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
| **Academic year**   | e.g. "2026-2027"; scopes the grades and donations. One is current.      |
| **Term / Period**   | A recurring period defined by months (e.g. Sept–Dec), shared by every year. |
| **Subject**         | A subject offered at a level ("Math"); the same name exists once per level. |
| **Enrollment**      | The link between a student and a class, with start/end dates and status. |
| **Grade**           | A student's score in one subject for one term (1–10, or blank).         |
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
- Subjects have an order (column order on grade sheets) and an **active** flag to
  retire them without deleting history.
- A subject that already has grades cannot be deleted.

### 7. Grades

- A grade is one student's score in one subject for one term **in one school
  year** (a term is global, so the year is what separates years).
- Scores are whole numbers **1–10**; a blank means **not graded yet**. An
  optional remark can be attached.
- Grades are entered on a **class grade sheet**: the class roster (rows) against
  the level's subjects (columns), for a chosen term and school year.
- A grade's subject must belong to the class's level, and the student must be
  actively enrolled. Teachers edit only their own classes.
- Averages, ranks and totals are **computed when a report is viewed**, never
  stored, so they can't drift from the underlying scores.

### 8. Reports

**Period report (per student, per term)**

- One row per subject of the student's level: score and remark.
- **Average** = mean of the subjects that have a score (blanks ignored).
- **Rank** within the class for that term, with ties sharing a position.
- **Attendance** for the term (counts by status and presence rate), when the
  term has date bounds.

**Yearly report (per student, per academic year)**

- The year's terms in order.
- Per subject: the term scores and a **per-subject average**.
- **Overall average** = mean of the per-subject averages (equal weight per
  subject).
- Attendance across the year's term date bounds.

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
3. A grade's subject must belong to the class's level.
4. Scores are 1–10 or blank; donations are non-negative amounts (2 decimals,
   single currency).
5. A graded term or subject, or a year with grades or donations, cannot be
   deleted — history is protected. Periods must not overlap.
6. At most one academic year is current.
7. Donation amounts and payments are manager-only.

## Not built yet / roadmap

- **UI pages**: sign-in exists; dashboards, class/student/guardian management,
  attendance, grade entry, and report screens do not.
- **Registration flow**: should set the student's expected donation (defaulting
  to the global amount) when a student is enrolled.
- **Report export**: printable/PDF period and yearly report cards.
- **Frozen report cards**: reports are live; persist snapshots only if published
  reports must not change retroactively.
- **Donation installments / audit**: replace the single paid value with a
  payments table if needed.
- **Cross-level subject reporting** and **teacher-per-subject** if the school
  grows into needing them.

## Glossary of derived values

| Value            | Formula / rule                                             |
| ---------------- | ---------------------------------------------------------- |
| Grade average    | mean of non-blank scores                                   |
| Yearly subject avg | mean of that subject's non-blank term scores            |
| Overall avg      | mean of per-subject averages                               |
| Rank             | 1 + number of classmates with a strictly higher average    |
| Presence rate    | `(Present + Late + Very late) / total attendance marks`    |
| Donation balance | `expectedAmount − paidAmount`                              |
| Donation status  | Exempt / Paid / Partial / Unpaid (see above)               |
