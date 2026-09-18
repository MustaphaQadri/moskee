# Context — where we are and what's next

> Living dev log. Update as features are built so work can resume cleanly.

## Status

Framework + scaffold + initial data model complete. DB migrated and seeded.
No user-facing features built yet.

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
- `Guardian` (`guardians`) — firstName, lastName, email, phone, address.
- `StudentGuardian` (`student_guardians`) — M:N student↔guardian + `relation`, `isPrimary`.
- `Room` / `Level` / `ClassSession` — managed lookup sets. `ClassSession` holds the
  6 weekend slots (Sat/Sun × morning/noon/afternoon) via `label`/`day`/`period`.
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

1. Sign-in page (`/sign-in`) + logout; verify role redirects.
2. Dashboard shell (`AppShell` layout) gated by `requireSession`.
3. Classes CRUD (managers manage; teachers see own classes).
4. Children + guardians registration (manager/teacher).
5. Enrollments linking children to classes.
6. Teacher management (manager-only).

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
