import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { MANAGER_ROLE, TEACHER_ROLE } from "@/lib/roles";

// Better Auth instance. See AGENTS.md for the conventions around auth.
//
// - `role` is an additional field on the user, defaulting to "teacher".
//   It is `input: false`, so it cannot be set through signup/sign-in and must
//   be assigned by a manager (see the seed/user-management flow).
// - Sign-up is disabled: staff accounts are created by a manager, not self-served.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: TEACHER_ROLE,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

export const isManager = (role?: string | null) => role === MANAGER_ROLE;
