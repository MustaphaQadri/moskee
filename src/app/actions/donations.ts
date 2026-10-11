"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import type { Prisma } from "@/generated/prisma/client";
import {
  DONATION_SETTING_ID,
  getDonationSetting,
  getStudentDonation,
  type StudentDonationDTO,
} from "@/lib/donations";

// Server Actions are public endpoints: validate input, then re-check auth and
// authorization. Donations are financial data — managers only. Every payment
// create/update/delete is written to the audit log.

const money = z.number().min(0).max(1_000_000);
const positiveMoney = z
  .number()
  .positive("Bedrag moet groter zijn dan 0")
  .max(1_000_000);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

const CATEGORIES = ["FULL", "REDUCED", "EXEMPT"] as const;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function revalidateDonations(studentId?: string) {
  revalidatePath("/dashboard/donations");
  if (studentId) revalidatePath(`/dashboard/donations/${studentId}`);
}

async function assertStudentAndYear(studentId: string, academicYearId: string) {
  const [student, academicYear] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true },
    }),
  ]);
  if (!student) throw new ActionError("Leerling niet gevonden");
  if (!academicYear) throw new ActionError("Schooljaar niet gevonden");
}

// Ensure a StudentDonation (expectation) row exists, defaulting to the global
// setting when the student has none yet. Returns the academic year.
async function ensureExpectation(
  tx: Prisma.TransactionClient,
  studentId: string,
  academicYearId: string,
  actorId: string,
): Promise<void> {
  const existing = await tx.studentDonation.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId } },
    select: { id: true },
  });
  if (existing) return;

  const { defaultAmount } = await getDonationSetting();
  await tx.studentDonation.create({
    data: {
      studentId,
      academicYearId,
      expectedAmount: round2(defaultAmount),
      category: defaultAmount > 0 ? "FULL" : "EXEMPT",
      recordedById: actorId,
    },
  });
}

// ----- Global default -----

export async function setDonationDefault(
  input: unknown,
): Promise<ActionResult<{ defaultAmount: number }>> {
  await requireManager();
  try {
    const { defaultAmount } = z.object({ defaultAmount: money }).parse(input);

    const setting = await prisma.donationSetting.upsert({
      where: { id: DONATION_SETTING_ID },
      create: { id: DONATION_SETTING_ID, defaultAmount: round2(defaultAmount) },
      update: { defaultAmount: round2(defaultAmount) },
      select: { defaultAmount: true },
    });

    revalidatePath("/dashboard/manage");
    revalidatePath("/dashboard/donations");
    return { ok: true, data: { defaultAmount: Number(setting.defaultAmount) } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// ----- Expectation (per student, per year) -----

export async function setStudentDonation(
  input: unknown,
): Promise<ActionResult<StudentDonationDTO | null>> {
  const session = await requireManager();
  try {
    const parsed = z
      .object({
        studentId: z.string().min(1),
        academicYearId: z.string().min(1),
        expectedAmount: money.optional(),
        category: z.enum(CATEGORIES).optional(),
        note: z.string().trim().max(500).nullish(),
      })
      .parse(input);

    await assertStudentAndYear(parsed.studentId, parsed.academicYearId);

    const category = parsed.category ?? "FULL";
    let expectedAmount: number;
    if (category === "EXEMPT") {
      expectedAmount = 0;
    } else if (typeof parsed.expectedAmount === "number") {
      expectedAmount = parsed.expectedAmount;
    } else {
      expectedAmount = (await getDonationSetting()).defaultAmount;
    }

    const note = parsed.note?.length ? parsed.note : null;

    await prisma.studentDonation.upsert({
      where: {
        studentId_academicYearId: {
          studentId: parsed.studentId,
          academicYearId: parsed.academicYearId,
        },
      },
      create: {
        studentId: parsed.studentId,
        academicYearId: parsed.academicYearId,
        expectedAmount: round2(expectedAmount),
        category,
        note,
        recordedById: session.user.id,
      },
      update: {
        expectedAmount: round2(expectedAmount),
        category,
        note,
      },
    });

    revalidateDonations(parsed.studentId);
    return {
      ok: true,
      data: await getStudentDonation({
        studentId: parsed.studentId,
        academicYearId: parsed.academicYearId,
      }),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteStudentDonation(
  input: unknown,
): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = z
      .object({
        studentId: z.string().min(1),
        academicYearId: z.string().min(1),
      })
      .parse(input);

    await prisma.studentDonation.deleteMany({
      where: {
        studentId: parsed.studentId,
        academicYearId: parsed.academicYearId,
      },
    });

    revalidateDonations(parsed.studentId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// ----- Payments (ledger) -----

export async function addDonationPayment(
  input: unknown,
): Promise<ActionResult<StudentDonationDTO | null>> {
  const session = await requireManager();
  try {
    const parsed = z
      .object({
        studentId: z.string().min(1),
        academicYearId: z.string().min(1),
        amount: positiveMoney,
        paidAt: dateOnly,
        note: z.string().trim().max(500).nullish(),
      })
      .parse(input);

    await assertStudentAndYear(parsed.studentId, parsed.academicYearId);
    const note = parsed.note?.length ? parsed.note : null;
    const paidAt = parseDateOnly(parsed.paidAt);

    await prisma.$transaction(async (tx) => {
      await ensureExpectation(
        tx,
        parsed.studentId,
        parsed.academicYearId,
        session.user.id,
      );

      const payment = await tx.donationPayment.create({
        data: {
          studentId: parsed.studentId,
          academicYearId: parsed.academicYearId,
          amount: round2(parsed.amount),
          paidAt,
          note,
          recordedById: session.user.id,
        },
        select: { id: true },
      });

      await tx.donationPaymentLog.create({
        data: {
          paymentId: payment.id,
          studentId: parsed.studentId,
          academicYearId: parsed.academicYearId,
          action: "CREATED",
          amountAfter: round2(parsed.amount),
          paidAtAfter: paidAt,
          note,
          actorId: session.user.id,
        },
      });
    });

    revalidateDonations(parsed.studentId);
    return {
      ok: true,
      data: await getStudentDonation({
        studentId: parsed.studentId,
        academicYearId: parsed.academicYearId,
      }),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateDonationPayment(
  input: unknown,
): Promise<ActionResult<StudentDonationDTO | null>> {
  const session = await requireManager();
  try {
    const parsed = z
      .object({
        paymentId: z.string().min(1),
        amount: positiveMoney,
        paidAt: dateOnly,
        note: z.string().trim().max(500).nullish(),
      })
      .parse(input);

    const existing = await prisma.donationPayment.findUnique({
      where: { id: parsed.paymentId },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        amount: true,
        paidAt: true,
      },
    });
    if (!existing) throw new ActionError("Betaling niet gevonden");

    const note = parsed.note?.length ? parsed.note : null;
    const paidAt = parseDateOnly(parsed.paidAt);

    await prisma.$transaction([
      prisma.donationPayment.update({
        where: { id: existing.id },
        data: {
          amount: round2(parsed.amount),
          paidAt,
          note,
          recordedById: session.user.id,
        },
      }),
      prisma.donationPaymentLog.create({
        data: {
          paymentId: existing.id,
          studentId: existing.studentId,
          academicYearId: existing.academicYearId,
          action: "UPDATED",
          amountBefore: Number(existing.amount),
          amountAfter: round2(parsed.amount),
          paidAtBefore: existing.paidAt,
          paidAtAfter: paidAt,
          note,
          actorId: session.user.id,
        },
      }),
    ]);

    revalidateDonations(existing.studentId);
    return {
      ok: true,
      data: await getStudentDonation({
        studentId: existing.studentId,
        academicYearId: existing.academicYearId,
      }),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteDonationPayment(
  input: unknown,
): Promise<ActionResult<StudentDonationDTO | null>> {
  const session = await requireManager();
  try {
    const { paymentId } = z.object({ paymentId: z.string().min(1) }).parse(input);

    const existing = await prisma.donationPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        amount: true,
        paidAt: true,
        note: true,
      },
    });
    if (!existing) throw new ActionError("Betaling niet gevonden");

    await prisma.$transaction([
      prisma.donationPaymentLog.create({
        data: {
          paymentId: null,
          studentId: existing.studentId,
          academicYearId: existing.academicYearId,
          action: "DELETED",
          amountBefore: Number(existing.amount),
          paidAtBefore: existing.paidAt,
          note: existing.note,
          actorId: session.user.id,
        },
      }),
      prisma.donationPayment.delete({ where: { id: existing.id } }),
    ]);

    revalidateDonations(existing.studentId);
    return {
      ok: true,
      data: await getStudentDonation({
        studentId: existing.studentId,
        academicYearId: existing.academicYearId,
      }),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
