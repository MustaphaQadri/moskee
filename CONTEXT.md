# Context — where we are and what's next

> Living dev log. Update as features are built so work can resume cleanly.

## Status

Framework + scaffold + data model complete. DB migrated and seeded.
Sign-in, dashboard shell (role-aware nav + light/dark toggle), subscription
management under "Inschrijvingen", staff (manager/teacher) management, a Beheer
screen (levels, rooms, subjects, timeslots, academic years, global periods),
and classes (grid, detail, enrollment/move, student comments) are built.
Subjects and students support an optional uploaded image; periods are defined
once by month range and applied to every year. Managers can reset a staff
password (generates a temporary one; the user must set a new one on next
sign-in), and bulk-move or remove selected students from a class's roster (with
confirmation). Attendance is built: a per-meeting sheet from the class detail
(slot/date preselected, Aanwezig/Te laat/Erg laat/Afwezig/Geoorloofd) with a pie
chart, plus attendance summaries and non-present days on the student detail.
Grades UI is next (its button is still disabled).

- Next.js 16 (App Router) · Mantine 9 · Better Auth 1.7 · Prisma 7 + PostgreSQL · pnpm
- `pnpm build`, `pnpm lint`, `pnpm typecheck` all green. Dev server smoke-tested.
- Dev DB: Docker container `moskee-db` (postgres:15) on `localhost:5433`, volume `moskee-db-data`.

## What exists

- `src/lib/auth.ts` — Better Auth (email/password, signup disabled, `role` on user, `nextCookies`)
- `src/lib/dal.ts` — `requireSession` / `requireRole` / `getCurrentUser` (server-only)
- `src/lib/prisma.ts` — PrismaPg adapter singleton
- `src/lib/roles.ts` — `manager` | `teacher`
- `prisma/schema.prisma` — auth tables + domain model (see below)
- `prisma/migrations/20260918215041_init/migration.sql` — initial schema migration (applied)
- `prisma/seed.ts` — bootstraps first manager (`pnpm db:seed`)
- `src/app/page.tsx` — placeholder landing page
- Skills in `.opencode/skills/` — `mantine-ui-ux`, `nextjs-better-auth`, `prisma-data-layer`

## Data model (initial)

Teachers are `User` rows with `role = "teacher"` (no separate table); `User`
gained a `phone` column. All domain tables have `id` (cuid) + `createdAt` +
`updatedAt`.

- `Student` (`students`) — firstName, lastName, `sex` (enum), dateOfBirth.
- `Guardian` (`guardians`) — firstName, lastName, email, phone, address,
  `donationNumber?` + `educationNumber?` (optional, unique — subscription ids).
- `StudentGuardian` (`student_guardians`) — M:N student↔guardian + `relation`.
- `Room` / `Level` / `ClassSession` — managed lookup sets. `ClassSession` holds the
  weekend slots via `label`/`day`/`startTime`/`endTime` (the old `period` column
  was removed). Subjects carry `description?` + `image?`; `Competency`
  ("vaardigheden") was removed.
- `SchoolClass` (`classes`) — name, description, level (required), room?, teacher?.
- `SchoolClassSession` (`class_session_links`) — M:N class↔session.
- `Enrollment` (`enrollments`) — M:N student↔class + dates/status.
- `StudentComment` / `GuardianComment` / `ClassComment` — separate tables per
  entity, each with `body` + optional `authorId` (staff `User`).

## Setup (done)

1. Dev Postgres: `docker run -d --name moskee-db -e POSTGRES_USER=moskee -e POSTGRES_PASSWORD=moskee -e POSTGRES_DB=moskee -p 5433:5432 -v moskee-db-data:/var/lib/postgresql/data postgres:15`
2. `.env` / `.env.example` point at `postgresql://moskee:moskee@localhost:5433/moskee`.
3. `pnpm db:migrate` applied `20260918215041_init`; `pnpm db:seed` created `manager@moskee.local` / `change-me-123`.

> Rotate `BETTER_AUTH_SECRET` and the manager password before any real deployment.

## Next steps (feature work, in order)

1. ~~Sign-in page (`/sign-in`) + logout; verify role redirects.~~ Done.
2. ~~Dashboard shell (`AppShell` layout) gated by `requireSession`.~~ Done.
3. ~~Guardian + student registration (subscription form, list, detail).~~ Done
   (manager-only; students are added from a guardian).
4. ~~Staff management (managers add/find/edit/remove managers & teachers).~~ Done
   (manager-only; cannot delete self or the last manager).
5. ~~Beheer screen + classes: levels/rooms/subjects/timeslots CRUD (manager-only),
   classes grid + detail, enroll/move students (manager-only), and per-student
   comments (add by staff, delete by managers).~~ Done. `seed.ts` also creates the
   6 default timeslots.
6. ~~Attendance UI (per-meeting sheet from the class detail; student summaries
   with pie chart + non-present days).~~ Done (`/dashboard/classes/[id]/attendance`).
7. Grades UI (grade sheets per class/term, subjects per level; button disabled).
8. Enrollments from the guardian registration flow (currently only via classes).

## Open decisions

- Data model confirmed for now (Teacher = `User`, comments per entity, `Student`
  rename, session = weekend slot). Old `Child.allergies`/`notes` were dropped;
  re-add or move to comments if needed.
- Whether guardians ever get their own login (currently data entities only).
- Language/localization (app copy is currently English; "Moskee" is Dutch).

## How to run

| Command            | Purpose                            |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Dev server                         |
| `pnpm db:generate` | Regenerate Prisma client           |
| `pnpm db:migrate`  | Create/apply dev migration         |
| `pnpm db:seed`     | Bootstrap first manager            |
| `pnpm build`       | Production build                   |
| `pnpm typecheck` / `pnpm lint` | Static checks          |
