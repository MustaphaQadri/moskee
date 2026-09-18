# Functional overview

What Moskee does, in product terms. This is the companion to
[`domain-model.md`](./domain-model.md) (technical/data model) and
[`AGENTS.md`](../AGENTS.md) (stack + conventions).

> **Status.** The data layer and Server Actions exist for the areas below; the
> only user-facing flow built so far is authentication. There are **no UI pages
> yet** for students, classes, attendance, grades, reports, or donations. This
> document describes the intended behaviour that those pages will expose.

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
| **Session slot**    | A recurring weekend slot: Saturday/Sunday × morning/noon/afternoon (6 possible). |
| **Meeting**         | A dated occurrence of a class in a session slot — `(class, slot, date)`. |
| **Academic year**   | e.g. "2026-2027"; contains the terms. One is current.                   |
| **Term / Period**   | A period within a year (three per year), with optional date bounds.     |
| **Subject**         | A subject offered at a level ("Math"); the same name exists once per level. |
| **Enrollment**      | The link between a student and a class, with start/end dates and status. |
| **Grade**           | A student's score in one subject for one term (1–10, or blank).         |
| **Donation**        | A yearly amount a family is expected to give for a student.             |

## Features

### 1. Students & guardians

- A **student** has first/last name, optional sex, and date of birth.
- A **guardian** has first/last name, optional email, phone, and address.
- Students and guardians are linked many-to-many; each link records the
  **relation** ("mother", "father", "aunt", …) and whether it is the **primary**
  guardian. A guardian can be related differently to different children.
- Both students and guardians can carry free-text comments from staff.

### 2. Classes & scheduling

- A class belongs to a **level** (required), and may have a **room** and a
  **teacher**.
- A class runs in **one or more session slots** (e.g. Saturday morning *and*
  Sunday noon).
- Rooms have an optional capacity.
- Levels and rooms are managed lists.

### 3. Enrollment

- A student is enrolled in a class with a start date, optional end date, and a
  status of **active** or **withdrawn**.
- Only **active** enrollments appear on rosters and can be marked/graded.
- Working assumption: **one class per student per term** (a class teaches all
  subjects for its level).

### 4. Attendance

- Attendance is taken per **meeting**: a class, a session slot, and a date.
- Each student is marked **Present**, **Absent**, **Late**, or **Excused**;
  an optional note can be added.
- Re-saving a roster updates existing marks instead of duplicating them.
- Teachers may take attendance only for their own classes; managers for any.
- Presence rate for a period = `(Present + Late) / total marks`.

### 5. Academic years & terms

- Each **academic year** holds its terms; exactly one year is marked **current**.
- A **term** (labelled "Period" in the UI) has a name, an order, and optional
  start/end dates.
- The term's date bounds are what let reports count attendance for that period.

### 6. Subjects

- Subjects are defined **per level**: "Math" exists once at each level as its own
  subject. A class studies the subjects of its level.
- Subjects have an order (column order on grade sheets) and an **active** flag to
  retire them without deleting history.
- A subject that already has grades cannot be deleted.

### 7. Grades

- A grade is one student's score in one subject for one term.
- Scores are whole numbers **1–10**; a blank means **not graded yet**. An
  optional remark can be attached.
- Grades are entered on a **class grade sheet**: the class roster (rows) against
  the level's subjects (columns), for a chosen term.
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
   deleted — history is protected.
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
| Presence rate    | `(Present + Late) / total attendance marks`                |
| Donation balance | `expectedAmount − paidAmount`                              |
| Donation status  | Exempt / Paid / Partial / Unpaid (see above)               |
