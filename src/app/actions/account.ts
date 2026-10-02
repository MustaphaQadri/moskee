"use server";

import { z } from "zod";
import { hashPassword, verifyPassword } from "better-auth/crypto";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";

// Change the password of the signed-in user. Also used for the forced change
// after a manager reset (clears `mustChangePassword`). Treat as a public
// endpoint: re-check the session and validate input.

const schema = z
  .object({
    currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
    newPassword: z
      .string()
      .min(8, "Nieuw wachtwoord moet minstens 8 tekens zijn")
      .max(200),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Nieuw wachtwoord moet verschillen van het huidige",
    path: ["newPassword"],
  });

export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) throw new ActionError("Niet ingelogd");

  try {
    const parsed = schema.parse(input);

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "credential" },
      select: { id: true, password: true },
    });
    if (!account?.password) {
      throw new ActionError("Dit account heeft geen wachtwoord-login");
    }

    const valid = await verifyPassword({
      hash: account.password,
      password: parsed.currentPassword,
    });
    if (!valid) throw new ActionError("Huidig wachtwoord is onjuist");

    const hashed = await hashPassword(parsed.newPassword);
    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { password: hashed },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { mustChangePassword: false },
      }),
    ]);

    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
