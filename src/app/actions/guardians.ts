"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly } from "@/lib/dates";

// Manager-only management of guardians and their students. Every action
// re-checks the role on the server. Input is validated with Zod; failures are
// returned as a result object (not thrown) so the UI can show a Dutch message.

// A domain-level error whose message is safe to show to the user.
class ActionError extends Error {}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));
}

const guardianFields = {
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, {
      message: "Ongeldig e-mailadres",
    }),
  phone: optionalText(50),
  address: optionalText(500),
  donationNumber: optionalText(50),
  educationNumber: optionalText(50),
};

const studentFields = {
  firstName: z.string().trim().min(1, "Voornaam is verplicht").max(100),
  lastName: z.string().trim().min(1, "Achternaam is verplicht").max(100),
  sex: z.enum(["MALE", "FEMALE"]).nullish(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geboortedatum is verplicht (jjjj-mm-dd)"),
  relation: optionalText(50),
  image: optionalText(500),
};

const studentSchema = z.object(studentFields);

const subscriptionSchema = z.object({
  ...guardianFields,
  students: z.array(studentSchema).default([]),
});

const updateGuardianSchema = z.object({ id: z.string().min(1), ...guardianFields });

const addStudentSchema = z.object({
  guardianId: z.string().min(1),
  ...studentFields,
});

const updateStudentSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1),
  ...studentFields,
});

function studentData(student: z.infer<typeof studentSchema>) {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    sex: student.sex ?? null,
    dateOfBirth: parseDateOnly(student.dateOfBirth),
    image: student.image,
  };
}

// The two numbers are optional but unique. Check up front so we can return a
// friendly Dutch message instead of surfacing a raw P2002 constraint error.
async function assertNumbersAvailable(
  numbers: { donationNumber: string | null; educationNumber: string | null },
  excludeId?: string,
): Promise<void> {
  const not = excludeId ? { id: { not: excludeId } } : {};

  if (numbers.donationNumber) {
    const clash = await prisma.guardian.findFirst({
      where: { donationNumber: numbers.donationNumber, ...not },
      select: { id: true },
    });
    if (clash) throw new ActionError("Dit donatienummer is al in gebruik");
  }

  if (numbers.educationNumber) {
    const clash = await prisma.guardian.findFirst({
      where: { educationNumber: numbers.educationNumber, ...not },
      select: { id: true },
    });
    if (clash) throw new ActionError("Dit onderwijsnummer is al in gebruik");
  }
}

function toError(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Ongeldige invoer";
  }
  console.error(error);
  return "Er ging iets mis. Probeer het opnieuw.";
}

// Guardian subscription: create the guardian and (optionally) their students in
// one transaction. Used by the "Inschrijven" form.
export async function createGuardianWithStudents(
  input: unknown,
): Promise<ActionResult<{ guardianId: string }>> {
  await requireManager();
  try {
    const parsed = subscriptionSchema.parse(input);
    await assertNumbersAvailable(parsed);

    const guardian = await prisma.guardian.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        address: parsed.address,
        donationNumber: parsed.donationNumber,
        educationNumber: parsed.educationNumber,
        children: {
          create: parsed.students.map((student) => ({
            relation: student.relation,
            student: { create: studentData(student) },
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/guardians");
    return { ok: true, data: { guardianId: guardian.id } };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateGuardian(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateGuardianSchema.parse(input);
    await assertNumbersAvailable(parsed, parsed.id);

    await prisma.guardian.update({
      where: { id: parsed.id },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        address: parsed.address,
        donationNumber: parsed.donationNumber,
        educationNumber: parsed.educationNumber,
      },
    });

    revalidatePath("/dashboard/guardians");
    revalidatePath(`/dashboard/guardians/${parsed.id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

// Link a new student to an existing guardian (from the guardian detail view).
export async function addStudentToGuardian(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = addStudentSchema.parse(input);

    const guardian = await prisma.guardian.findUnique({
      where: { id: parsed.guardianId },
      select: { id: true },
    });
    if (!guardian) throw new ActionError("Ouder/verzorger niet gevonden");

    await prisma.studentGuardian.create({
      data: {
        guardian: { connect: { id: parsed.guardianId } },
        relation: parsed.relation,
        student: { create: studentData(parsed) },
      },
    });

    revalidatePath("/dashboard/guardians");
    revalidatePath(`/dashboard/guardians/${parsed.guardianId}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

// Update a student and the relation of the link to this guardian.
export async function updateStudent(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateStudentSchema.parse(input);

    await prisma.$transaction([
      prisma.student.update({
        where: { id: parsed.studentId },
        data: studentData(parsed),
      }),
      prisma.studentGuardian.update({
        where: {
          studentId_guardianId: {
            studentId: parsed.studentId,
            guardianId: parsed.guardianId,
          },
        },
        data: { relation: parsed.relation },
      }),
    ]);

    revalidatePath("/dashboard/guardians");
    revalidatePath(`/dashboard/guardians/${parsed.guardianId}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
