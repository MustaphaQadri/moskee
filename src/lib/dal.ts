import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRole, type Role } from "@/lib/roles";

// Data Access Layer — centralizes session + authorization checks. Import these
// in Server Components, Route Handlers, and Server Actions. Client Components
// cannot import this module.

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user ?? null;
});

// Throws a redirect to /sign-in when there is no active session.
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

// Like requireSession, but also forces users who must still change their
// password (after a manager reset) to /change-password. Use in the dashboard
// shell; the change-password page itself uses getSession so it is reachable.
export async function requireActiveSession() {
  const session = await requireSession();
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }
  return session;
}

// Requires an authenticated user AND one of the given roles. Redirects
// unauthenticated users to /sign-in and unauthorized users to /.
export async function requireRole(...allowed: Role[]) {
  const session = await requireSession();
  const role = session.user?.role;

  if (!role || !isRole(role) || !allowed.includes(role)) {
    redirect("/");
  }

  return session;
}
