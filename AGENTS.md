<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Moskee — School Management App

Small-school management: classes, child + guardian registration, and
role-based access for **managers** and **teachers**.

## Tech stack

| Concern     | Choice                                    | Notes                                        |
| ----------- | ----------------------------------------- | -------------------------------------------- |
| Framework   | Next.js **16** (App Router, React 19)     | Breaking changes vs older Next.js — read below |
| UI          | Mantine **9**                             | Client-component library, PostCSS setup      |
| Forms       | `@mantine/form`                           |                                              |
| Auth        | Better Auth **1.7**                       | Email/password, DB sessions, role in user    |
| Database    | PostgreSQL + Prisma **7**                 | Driver-adapter + query compiler (no Rust engine) |
| Language    | TypeScript (strict)                       |                                              |
| Package     | pnpm                                      |                                              |

## Version-specific gotchas (read before coding)

These differ from older versions and are the most common source of mistakes.

### Next.js 16
- **`middleware.ts` is deprecated → `proxy.ts`** with `export function proxy()`.
  Use the Node.js runtime (default) for full session validation.
- `cookies()`, `headers()`, and route-handler `params` are **async** — always `await` them.
- Route handlers use `route.ts`; dynamic params are `Promise<...>`:
  `export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> })`.
- Typed routes are generated: use `LayoutProps<"/">`, `PageProps<"/...">`, `RouteContext<"/...">` (run `pnpm typegen` after adding routes).
- Auth checks belong **close to the data source** (DAL/Server Actions), not only in layouts/proxy — see `src/lib/dal.ts`.

### Mantine 9
- Requires `postcss.config.cjs` (already present) and `@mantine/core/styles.css` imported once in the root layout.
- Every package except `@mantine/hooks` needs its own styles import (e.g. `@mantine/notifications/styles.css`).
- Use `<ColorSchemeScript />` in `<head>` and `{...mantineHtmlProps}` on `<html>` to avoid hydration warnings.
- All Mantine component entry points already carry `"use client"` — pages that only render Mantine components do **not** need their own `'use client'`.
- Compound components (`<Popover.Target>`) can't be server components — use `PopoverTarget`/`PopoverDropdown` or add `'use client'`.
- Theme overrides via `createTheme` + `<MantineProvider theme={...}>`.

### Better Auth 1.7
- Add `nextCookies()` as the **last** plugin so Server Actions can set session cookies.
- Mount with `toNextJsHandler(auth)` at `src/app/api/auth/[...all]/route.ts`.
- Client uses `createAuthClient` from `better-auth/react` (import only in Client Components).
- Server session: `await auth.api.getSession({ headers: await headers() })`.
- Roles are stored as an additional field on the user (`input: false` — never settable via signup).

### Prisma 7
- Config lives in **`prisma7.config.ts`** (schema path, datasource URL, migrations, seed).
- Generator is `prisma-client` with output `../src/generated/prisma` (gitignored; regenerate with `pnpm db:generate`).
- The client requires a **driver adapter**: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — see `src/lib/prisma.ts`.
- No Rust engine, no auto-generate after migrate, no auto-seed. Run `pnpm db:generate` explicitly after schema changes.
- `.env` is **not** auto-loaded by the Prisma CLI — `prisma7.config.ts` imports `dotenv/config`.

## Project structure

```
prisma/
  schema.prisma        # auth tables + domain models
  seed.ts              # bootstraps the first manager
prisma7.config.ts      # Prisma CLI config
src/
  app/
    layout.tsx         # MantineProvider + ColorSchemeScript
    page.tsx
    api/auth/[...all]/route.ts   # Better Auth handler
    (future: sign-in, dashboard, classes, children, guardians)
  generated/prisma/    # generated client (gitignored)
  lib/
    auth.ts            # Better Auth server instance
    auth-client.ts     # Better Auth client instance
    dal.ts             # session + role checks (server-only)
    prisma.ts          # Prisma client singleton
    roles.ts           # Role types + constants
```

## Conventions

### Server vs client components
- Default to **Server Components**. Fetch data and check auth on the server.
- Add `'use client'` only where interactivity is required (forms, hooks, state).
- Client components cannot import `src/lib/dal.ts` (it imports `server-only`). Pass data as props from a server parent.

### Auth & authorization
- Use `requireSession()` / `requireRole("manager")` / `getCurrentUser()` from `src/lib/dal.ts`.
- **Never** trust role/UI checks on the client alone — re-verify in Server Actions and Route Handlers.
- Roles: `manager` (full access) and `teacher` (own classes). See `src/lib/roles.ts`.
- Use `proxy.ts` only for optimistic redirects; enforce real authorization in the DAL/actions.

### Data access
- Go through the Prisma singleton in `src/lib/prisma.ts`. Never instantiate `PrismaClient` directly in app code.
- Return DTOs (only the fields the client needs), never entire objects with sensitive fields.
- Use Zod/`@mantine/form` validation on input; treat Server Actions like public endpoints.

### Styling
- Use Mantine components and the `style`/`className` props with Mantine tokens.
- Prefer `Stack`, `Group`, `Grid`, `SimpleGrid` for layout over hand-rolled CSS.

## Commands

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Start dev server                               |
| `pnpm build`        | Production build (run before committing)       |
| `pnpm lint`         | ESLint                                         |
| `pnpm typecheck`    | TypeScript check                               |
| `pnpm typegen`      | Regenerate Next.js route types                 |
| `pnpm db:generate`  | Regenerate Prisma client after schema edits    |
| `pnpm db:migrate`   | Create/apply a dev migration                   |
| `pnpm db:deploy`    | Apply migrations (production)                  |
| `pnpm db:seed`      | Bootstrap the first manager account            |
| `pnpm db:studio`    | Open Prisma Studio                             |

**Always run `pnpm lint` and `pnpm typecheck` after changing code.** The
generated Prisma client has `@ts-nocheck`, so it is excluded from typecheck —
but our own code is not.

## Definition of done
1. Feature works end-to-end with a real database.
2. Auth + authorization verified for every new route/action.
3. `pnpm lint` and `pnpm typecheck` pass.
4. No secrets committed (`.env` is gitignored; `.env.example` is the source of truth).
