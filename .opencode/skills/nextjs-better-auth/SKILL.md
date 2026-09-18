---
name: nextjs-better-auth
description: Use when implementing or reviewing authentication, authorization, sessions, roles, sign-in/sign-out, or protected routes in this Next.js 16 + Better Auth 1.7 app. Covers proxy.ts (not middleware), async cookies/headers/params, nextCookies plugin, toNextJsHandler, the DAL, and where auth checks must live.
---

# Next.js 16 + Better Auth — auth & authorization

This app uses Better Auth 1.7 for email/password auth with database sessions
and a `role` field on the user. Key files:

- `src/lib/auth.ts` — server instance (`betterAuth`).
- `src/lib/auth-client.ts` — client instance (`createAuthClient`).
- `src/lib/dal.ts` — `getSession`, `getCurrentUser`, `requireSession`, `requireRole`.
- `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)`.
- `src/lib/roles.ts` — `Role` type + constants (`manager`, `teacher`).

## Next.js 16 breaking changes (always heed)

- `middleware.ts` is deprecated → **`proxy.ts`** with `export function proxy()`.
- `cookies()`, `headers()`, and route-handler `params` are async — `await` them.
- Route handlers use `route.ts`; `params` is a `Promise` (see `RouteContext`).
- Auth checks must be close to the data source, not only in layouts/proxy.

## Server-side session (Server Components / Actions / Route Handlers)

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

Prefer the cached DAL helpers instead of calling `auth.api.getSession` directly:

```ts
import { requireSession, requireRole, getCurrentUser } from "@/lib/dal";

const session = await requireSession();        // redirects to /sign-in
const session = await requireRole("manager");  // redirects to / if wrong role
const user = await getCurrentUser();           // null if anonymous
```

## Where to check auth

1. **DAL / Server Actions / Route Handlers** — the real security boundary.
   Treat every Server Action and Route Handler as a public endpoint and call
   `requireSession()`/`requireRole()` before any data access.
2. **Server Components** — call the DAL to gate rendering and fetch user data.
3. **`proxy.ts`** — optimistic redirects ONLY (cookie presence check). Never the
   sole source of security.

## Optimistic redirects in proxy.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  // NOT secure — cookie existence only. Real checks live in the DAL.
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

For full session validation in proxy, use `auth.api.getSession` with the
Node.js runtime (default in Next 16).

## Server Actions that set cookies

`nextCookies()` is registered as the **last** plugin in `src/lib/auth.ts`. Call
auth endpoints through `auth.api.*` in a Server Action and cookies are set
automatically:

```ts
"use server";
import { auth } from "@/lib/auth";

export async function signIn(data: { email: string; password: string }) {
  await auth.api.signInEmail({ body: data });
}
```

## Client side

```ts
"use client";
import { authClient } from "@/lib/auth-client";

// reactive session
const { data: session, isPending } = authClient.useSession();
// actions
await authClient.signIn.email({ email, password });
await authClient.signOut();
```

- `auth-client.ts` has `"use client"` and must only be imported in client code.
- Client-side role checks are UX only — never trust them for security.

## Roles & sign-up

- Roles live in `user.role` (`additionalFields`, `input: false`). Default `teacher`.
- Sign-up is **disabled** (`disableSignUp: true`). Staff accounts are created by
  a manager; the first manager is bootstrapped with `pnpm db:seed`.
- `isManager(role)` helper in `src/lib/auth.ts`; role types in `src/lib/roles.ts`.

## Security checklist for any new route/action

1. Does it call `requireSession()` or `requireRole()` before data access?
2. Is the role re-verified on the server (not just hidden in UI)?
3. Are returned objects DTOs (no `password`, `accessToken`, session fields)?
4. Is input validated (Zod / `@mantine/form`) before use?
