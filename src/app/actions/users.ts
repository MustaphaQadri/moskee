"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";

// Manager-only management of staff accounts (managers and teachers). Every
// action re-checks the role on the server. Results are returned (not thrown) so
// the UI can show a Dutch message.

class ActionError extends Error {}

export type StaffActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const roleSchema = z.enum(["manager", "teacher"]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Ongeldig e-mailadres").max(200)),
  password: z.string().min(8, "Wachtwoord moet minstens 8 tekens zijn").max(200),
  role: roleSchema,
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : null)),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Naam is verplicht").max(120),
  role: roleSchema,
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value ? value : null)),
});

const deleteSchema = z.object({ id: z.string().min(1) });

function toError(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Ongeldige invoer";
  }
  console.error(error);
  return "Er ging iets mis. Probeer het opnieuw.";
}

async function managerCount(): Promise<number> {
  return prisma.user.count({ where: { role: "manager" } });
}

// Human-friendly, unambiguous alphabet (no 0/O/1/l/I).
const PASSWORD_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 12): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }
  return password;
}

// Create a staff account (manager or teacher) with an email/password login.
export async function createStaff(
  input: unknown,
): Promise<StaffActionResult<{ userId: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existing) throw new ActionError("Dit e-mailadres is al in gebruik");

    const userId = randomUUID();
    const password = await hashPassword(parsed.password);

    await prisma.user.create({
      data: {
        id: userId,
        name: parsed.name,
        email: parsed.email,
        emailVerified: true,
        role: parsed.role,
        phone: parsed.phone,
        accounts: {
          create: {
            id: randomUUID(),
            // Better Auth's credential provider matches accountId to the user id.
            accountId: userId,
            providerId: "credential",
            password,
          },
        },
      },
    });

    revalidatePath("/dashboard/staff");
    return { ok: true, data: { userId } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateStaff(input: unknown): Promise<StaffActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);

    const target = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: { id: true, role: true },
    });
    if (!target) throw new ActionError("Medewerker niet gevonden");

    const isDemoting =
      target.role === "manager" && parsed.role !== "manager";
    if (isDemoting && (await managerCount()) <= 1) {
      throw new ActionError("Er moet minstens één beheerder blijven");
    }

    await prisma.user.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        role: parsed.role,
        phone: parsed.phone,
      },
    });

    revalidatePath("/dashboard/staff");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

// Reset a staff member's password: generate a random one, store its hash, force
// a change on next sign-in and revoke their active sessions. Returns the
// plaintext password once so the manager can hand it to the staff member.
export async function resetStaffPassword(
  input: unknown,
): Promise<StaffActionResult<{ password: string }>> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    const target = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: {
        id: true,
        accounts: {
          where: { providerId: "credential" },
          select: { id: true },
        },
      },
    });
    if (!target) throw new ActionError("Medewerker niet gevonden");
    const account = target.accounts[0];
    if (!account) {
      throw new ActionError("Dit account heeft geen wachtwoord-login");
    }

    const password = generatePassword();
    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { password: hashed },
      }),
      prisma.user.update({
        where: { id: parsed.id },
        data: { mustChangePassword: true },
      }),
      prisma.session.deleteMany({ where: { userId: parsed.id } }),
    ]);

    revalidatePath("/dashboard/staff");
    return { ok: true, data: { password } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function deleteStaff(input: unknown): Promise<StaffActionResult> {
  const session = await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    if (parsed.id === session.user.id) {
      throw new ActionError("Je kunt je eigen account niet verwijderen");
    }

    const target = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: { id: true, role: true },
    });
    if (!target) throw new ActionError("Medewerker niet gevonden");

    if (target.role === "manager" && (await managerCount()) <= 1) {
      throw new ActionError("Er moet minstens één beheerder blijven");
    }

    await prisma.user.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/staff");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
