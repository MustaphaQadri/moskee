import { z } from "zod";

// Shared result/error helpers for Server Actions. Actions return a discriminated
// result instead of throwing, so the UI can show a friendly Dutch message
// (Next.js redacts thrown error messages in production).

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// A domain-level error whose message is safe to show to the user.
export class ActionError extends Error {}

export function toActionError(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Ongeldige invoer";
  }
  console.error(error);
  return "Er ging iets mis. Probeer het opnieuw.";
}
