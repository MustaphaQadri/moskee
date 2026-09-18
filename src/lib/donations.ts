import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import type { DonationCategory } from "@/generated/prisma/enums";

// Read side of donations. Balance/status are always derived from
// `expectedAmount - paidAmount`; nothing is stored. Server-only.

export type DonationStatus = "PAID" | "PARTIAL" | "UNPAID" | "EXEMPT";

export type StudentDonationDTO = {
  studentId: string;
  academicYearId: string;
  expectedAmount: number;
  paidAmount: number;
  balance: number;
  category: DonationCategory;
  status: DonationStatus;
  paidAt: string | null;
  note: string | null;
};

export type DonationReportRowDTO = StudentDonationDTO & {
  firstName: string;
  lastName: string;
};

export type DonationReportDTO = {
  academicYear: { id: string; name: string };
  defaultAmount: number;
  rows: DonationReportRowDTO[];
  totals: {
    expected: number;
    paid: number;
    outstanding: number;
    students: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    exemptCount: number;
  };
};

export const DONATION_SETTING_ID = "default";

function statusOf(expected: number, paid: number): DonationStatus {
  if (expected <= 0) return "EXEMPT";
  if (paid >= expected) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

function toDTO(row: {
  studentId: string;
  academicYearId: string;
  expectedAmount: unknown;
  paidAmount: unknown;
  category: DonationCategory;
  paidAt: Date | null;
  note: string | null;
}): StudentDonationDTO {
  const expectedAmount = Number(row.expectedAmount);
  const paidAmount = Number(row.paidAmount);
  return {
    studentId: row.studentId,
    academicYearId: row.academicYearId,
    expectedAmount,
    paidAmount,
    balance: expectedAmount - paidAmount,
    category: row.category,
    status: statusOf(expectedAmount, paidAmount),
    paidAt: toDateOnly(row.paidAt),
    note: row.note,
  };
}

// The global default amount. Falls back to 0 when never configured.
export async function getDonationSetting(): Promise<{ defaultAmount: number }> {
  const setting = await prisma.donationSetting.findUnique({
    where: { id: DONATION_SETTING_ID },
    select: { defaultAmount: true },
  });
  return { defaultAmount: setting ? Number(setting.defaultAmount) : 0 };
}

export async function getStudentDonation(params: {
  studentId: string;
  academicYearId: string;
}): Promise<StudentDonationDTO | null> {
  const row = await prisma.studentDonation.findUnique({
    where: {
      studentId_academicYearId: {
        studentId: params.studentId,
        academicYearId: params.academicYearId,
      },
    },
    select: {
      studentId: true,
      academicYearId: true,
      expectedAmount: true,
      paidAmount: true,
      category: true,
      paidAt: true,
      note: true,
    },
  });
  return row ? toDTO(row) : null;
}

// Who paid and who didn't for a year (optionally one class). Students without a
// row fall back to the global default / FULL / paid 0, so rows never need to be
// pre-created.
export async function getDonationReport(params: {
  academicYearId: string;
  classId?: string;
}): Promise<DonationReportDTO | null> {
  const [academicYear, setting] = await Promise.all([
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true },
    }),
    getDonationSetting(),
  ]);
  if (!academicYear) return null;

  const students = params.classId
    ? (
        await prisma.enrollment.findMany({
          where: { classId: params.classId, status: "active" },
          select: { student: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        })
      ).map((enrollment) => enrollment.student)
    : await prisma.student.findMany({
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

  const donations = await prisma.studentDonation.findMany({
    where: {
      academicYearId: params.academicYearId,
      studentId: { in: students.map((student) => student.id) },
    },
    select: {
      studentId: true,
      academicYearId: true,
      expectedAmount: true,
      paidAmount: true,
      category: true,
      paidAt: true,
      note: true,
    },
  });
  const byStudent = new Map(donations.map((row) => [row.studentId, row]));

  const rows: DonationReportRowDTO[] = students.map((student) => {
    const existing = byStudent.get(student.id);
    const base = existing
      ? toDTO(existing)
      : toDTO({
          studentId: student.id,
          academicYearId: params.academicYearId,
          expectedAmount: setting.defaultAmount,
          paidAmount: 0,
          category: "FULL",
          paidAt: null,
          note: null,
        });
    return { ...base, firstName: student.firstName, lastName: student.lastName };
  });

  const totals = {
    expected: 0,
    paid: 0,
    outstanding: 0,
    students: rows.length,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    exemptCount: 0,
  };
  for (const row of rows) {
    totals.expected += row.expectedAmount;
    totals.paid += row.paidAmount;
    totals.outstanding += Math.max(row.balance, 0);
    if (row.status === "PAID") totals.paidCount += 1;
    else if (row.status === "PARTIAL") totals.partialCount += 1;
    else if (row.status === "UNPAID") totals.unpaidCount += 1;
    else totals.exemptCount += 1;
  }

  return {
    academicYear,
    defaultAmount: setting.defaultAmount,
    rows,
    totals,
  };
}
