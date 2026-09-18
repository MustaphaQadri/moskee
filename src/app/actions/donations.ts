"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly } from "@/lib/dates";
import {
  DONATION_SETTING_ID,
  getStudentDonation,
  type StudentDonationDTO,
} from "@/lib/donations";

// Server Actions are public endpoints: validate input, then re-check auth and
// authorization. Donations are financial data — managers only.

const money = z.number().min(0).max(1_000_000);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const CATEGORIES = ["FULL", "REDUCED", "EXEMPT"] as const;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function assertStudentAndYear(studentId: string, academicYearId: string) {
  const [student, academicYear] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } }),
  ]);
  if (!student) throw new Error("Student not found");
  if (!academicYear) throw new Error("Academic year not found");
}

// Set the single global default amount.
export async function setDonationDefault(input: unknown): Promise<{ defaultAmount: number }> {
  const { defaultAmount } = z.object({ defaultAmount: money }).parse(input);
  await requireManager();

  const setting = await prisma.donationSetting.upsert({
    where: { id: DONATION_SETTING_ID },
    create: { id: DONATION_SETTING_ID, defaultAmount: round2(defaultAmount) },
    update: { defaultAmount: round2(defaultAmount) },
    select: { defaultAmount: true },
  });
  return { defaultAmount: Number(setting.defaultAmount) };
}

// Set a student's expected amount / category for a year. `expectedAmount`
// defaults to the global setting (this is what registration would call).
export async function setStudentDonation(input: unknown): Promise<StudentDonationDTO | null> {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      academicYearId: z.string().min(1),
      expectedAmount: money.optional(),
      category: z.enum(CATEGORIES).optional(),
      note: z.string().trim().max(500).nullish(),
    })
    .parse(input);
  await requireManager();
  await assertStudentAndYear(parsed.studentId, parsed.academicYearId);

  const expectedAmount =
    parsed.expectedAmount ??
    (
      await prisma.donationSetting.findUnique({
        where: { id: DONATION_SETTING_ID },
        select: { defaultAmount: true },
      })
    )?.defaultAmount ??
    0;

  const category = parsed.category ?? "FULL";
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
      expectedAmount: round2(Number(expectedAmount)),
      category,
      note,
    },
    update: {
      expectedAmount: round2(Number(expectedAmount)),
      category,
      note,
    },
  });

  return getStudentDonation({
    studentId: parsed.studentId,
    academicYearId: parsed.academicYearId,
  });
}

// Record (overwrite) the single paid value. Creates the row with the default
// expected amount if it does not exist yet.
export async function setDonationPaid(input: unknown): Promise<StudentDonationDTO | null> {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      academicYearId: z.string().min(1),
      paidAmount: money,
      paidAt: dateOnly.nullish(),
      note: z.string().trim().max(500).nullish(),
    })
    .parse(input);
  const session = await requireManager();
  await assertStudentAndYear(parsed.studentId, parsed.academicYearId);

  const defaultAmount =
    (
      await prisma.donationSetting.findUnique({
        where: { id: DONATION_SETTING_ID },
        select: { defaultAmount: true },
      })
    )?.defaultAmount ?? 0;

  const paidAt = parsed.paidAt ? parseDateOnly(parsed.paidAt) : null;
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
      expectedAmount: round2(Number(defaultAmount)),
      paidAmount: round2(parsed.paidAmount),
      paidAt,
      note,
      recordedById: session.user.id,
    },
    update: {
      paidAmount: round2(parsed.paidAmount),
      paidAt,
      note,
      recordedById: session.user.id,
    },
  });

  return getStudentDonation({
    studentId: parsed.studentId,
    academicYearId: parsed.academicYearId,
  });
}

export async function deleteStudentDonation(input: unknown): Promise<void> {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      academicYearId: z.string().min(1),
    })
    .parse(input);
  await requireManager();

  await prisma.studentDonation.deleteMany({
    where: { studentId: parsed.studentId, academicYearId: parsed.academicYearId },
  });
}
