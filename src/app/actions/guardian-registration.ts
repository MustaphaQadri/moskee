"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import { pickNextEducationNumber } from "@/lib/guardians";
import { purgeExpiredArchived } from "@/lib/archive";
import {
  createRegistrationLink,
  saveRegistrationSetting,
  MAX_ARCHIVE_RETENTION_MONTHS,
  MAX_LINK_VALIDITY_DAYS,
  MIN_ARCHIVE_RETENTION_MONTHS,
  MIN_LINK_VALIDITY_DAYS,
  type RegistrationLinkDTO,
} from "@/lib/registration";

// Self-registration links: manager-only generation + a public submit action.
// The public action treats the token as the only credential and never trusts a
// guardian id from the client.

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));
}

const registrationChildSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
  sex: z.enum(["MALE", "FEMALE"]).nullish(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geboortedatum is verplicht (jjjj-mm-dd)"),
  relation: optionalText(50),
});

// Note: email, phone, address and donationNumber (label: "Chartnummer") are
// required in the public form. The education number is assigned automatically
// and is not part of the form.
const registrationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
  email: z
    .string()
    .trim()
    .min(1, "E-mailadres is verplicht")
    .max(200)
    .email("Ongeldig e-mailadres"),
  phone: z.string().trim().min(1, "Telefoon is verplicht").max(50),
  address: z.string().trim().min(1, "Adres is verplicht").max(500),
  donationNumber: z.string().trim().min(1, "Chartnummer is verplicht").max(50),
  children: z
    .array(registrationChildSchema)
    .min(1, "Voeg minimaal één leerling toe"),
});

const validitySchema = z.object({
  linkValidityDays: z
    .number()
    .int("Voer een heel aantal dagen in")
    .min(MIN_LINK_VALIDITY_DAYS, "Minimaal 1 dag")
    .max(MAX_LINK_VALIDITY_DAYS, "Maximaal 365 dagen"),
  archiveRetentionMonths: z
    .number()
    .int("Voer een heel aantal maanden in")
    .min(MIN_ARCHIVE_RETENTION_MONTHS, "Minimaal 1 maand")
    .max(MAX_ARCHIVE_RETENTION_MONTHS, "Maximaal 120 maanden"),
});

// Manager-only: generate (or replace) a self-registration link.
export async function createGuardianRegistrationLink(
  guardianId: string,
): Promise<ActionResult<RegistrationLinkDTO>> {
  const session = await requireManager();
  try {
    const id = z.string().min(1).parse(guardianId);
    const guardian = await prisma.guardian.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!guardian) {
      throw new ActionError("Ouder/verzorger niet gevonden");
    }
    if (guardian.status === "ARCHIVED") {
      throw new ActionError("Een gearchiveerde ouder/verzorger kan geen registratielink krijgen");
    }

    const link = await createRegistrationLink(guardian.id, session.user.id);
    revalidatePath(`/dashboard/guardians/${guardian.id}`);
    return { ok: true, data: link };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Public: the guardian submits their details and children via the one-time
// link. No session is required; the token is validated and consumed atomically.
export async function submitGuardianRegistration(
  input: unknown,
): Promise<ActionResult<{ guardianId: string }>> {
  try {
    const parsed = registrationSchema.parse(input);

    const guardianId = await prisma.$transaction(async (tx) => {
      // Claim the token first: only one submission can consume it.
      const claimed = await tx.guardianRegistrationToken.updateMany({
        where: {
          token: parsed.token,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ActionError("Deze link is niet meer geldig");
      }

      const link = await tx.guardianRegistrationToken.findUnique({
        where: { token: parsed.token },
        select: { guardianId: true },
      });
      if (!link) {
        throw new ActionError("Deze link is niet meer geldig");
      }

      // The chart number stays unique across guardians, but the current
      // guardian may keep its own value.
      if (parsed.donationNumber) {
        const clash = await tx.guardian.findFirst({
          where: {
            donationNumber: parsed.donationNumber,
            id: { not: link.guardianId },
          },
          select: { id: true },
        });
        if (clash) throw new ActionError("Dit chartnummer is al in gebruik");
      }

      // The education number is never edited through the public form. Assign
      // the smallest free number when the guardian does not have one yet.
      const current = await tx.guardian.findUnique({
        where: { id: link.guardianId },
        select: { educationNumber: true },
      });
      const educationNumber =
        current?.educationNumber ?? (await pickNextEducationNumber(tx));

      await tx.guardian.update({
        where: { id: link.guardianId },
        data: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email: parsed.email,
          phone: parsed.phone,
          address: parsed.address,
          donationNumber: parsed.donationNumber,
          educationNumber,
        },
      });

      for (const child of parsed.children) {
        await tx.studentGuardian.create({
          data: {
            guardian: { connect: { id: link.guardianId } },
            relation: child.relation,
            student: {
              create: {
                firstName: child.firstName,
                lastName: child.lastName,
                sex: child.sex ?? null,
                dateOfBirth: parseDateOnly(child.dateOfBirth),
                image: null,
              },
            },
          },
        });
      }

      return link.guardianId;
    });

    revalidatePath("/dashboard/guardians");
    revalidatePath(`/dashboard/guardians/${guardianId}`);
    return { ok: true, data: { guardianId } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Manager-only settings: link validity and archive retention.
export async function updateRegistrationSetting(
  input: unknown,
): Promise<
  ActionResult<{ linkValidityDays: number; archiveRetentionMonths: number }>
> {
  await requireManager();
  try {
    const parsed = validitySchema.parse(input);
    const setting = await saveRegistrationSetting(parsed);
    return { ok: true, data: setting };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Permanently remove archived students/guardians whose retention period passed.
export async function purgeArchivedRecords(): Promise<
  ActionResult<{ students: number; guardians: number }>
> {
  await requireManager();
  try {
    const result = await purgeExpiredArchived();
    revalidatePath("/dashboard/guardians");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/donations");
    revalidatePath("/dashboard/manage");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
