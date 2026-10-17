import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { statusOf, type DonationStatus } from "@/lib/donation-status";
import type {
  DonationCategory,
  DonationPaymentAction,
} from "@/generated/prisma/enums";

// Read side of donations. Balance/status are always derived from
// `expectedAmount − paidTotal` (paidTotal = sum of the payment ledger);
// nothing is stored. Server-only.

export { statusOf };
export type { DonationStatus };

export type DonationPaymentDTO = {
  id: string;
  amount: number;
  paidAt: string | null;
  note: string | null;
  recordedById: string | null;
  recordedByName: string | null;
  createdAt: string; // ISO
};

export type DonationPaymentLogDTO = {
  id: string;
  action: DonationPaymentAction;
  amountBefore: number | null;
  amountAfter: number | null;
  paidAtBefore: string | null;
  paidAtAfter: string | null;
  note: string | null;
  actorName: string | null;
  createdAt: string; // ISO
};

export type StudentDonationDTO = {
  studentId: string;
  academicYearId: string;
  expectedAmount: number;
  paidAmount: number;
  balance: number;
  category: DonationCategory;
  status: DonationStatus;
  note: string | null;
  paymentCount: number;
};

export type DonationReportRowDTO = StudentDonationDTO & {
  firstName: string;
  lastName: string;
  // Donation and education numbers of the linked guardians ("vader/moeder"),
  // used to look up all children of the same family in the donations overview.
  guardianDonationNumbers: string[];
  guardianEducationNumbers: string[];
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

export type DonationYearHistoryDTO = {
  academicYear: { id: string; name: string; isCurrent: boolean };
  expectedAmount: number;
  category: DonationCategory;
  paidAmount: number;
  balance: number;
  status: DonationStatus;
  note: string | null;
  payments: DonationPaymentDTO[];
  logs: DonationPaymentLogDTO[];
};

export type StudentDonationHistoryDTO = {
  student: { id: string; firstName: string; lastName: string };
  defaultAmount: number;
  years: DonationYearHistoryDTO[];
};

export const DONATION_SETTING_ID = "default";

function sumPayments(payments: { amount: unknown }[]): number {
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

function paymentDTO(row: {
  id: string;
  amount: unknown;
  paidAt: Date | null;
  note: string | null;
  recordedById: string | null;
  createdAt: Date;
  recordedBy: { name: string } | null;
}): DonationPaymentDTO {
  return {
    id: row.id,
    amount: Number(row.amount),
    paidAt: toDateOnly(row.paidAt),
    note: row.note,
    recordedById: row.recordedById,
    recordedByName: row.recordedBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
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
      category: true,
      note: true,
      payments: { select: { amount: true } },
    },
  });
  if (!row) return null;

  const expectedAmount = Number(row.expectedAmount);
  const paidAmount = sumPayments(row.payments);
  return {
    studentId: row.studentId,
    academicYearId: row.academicYearId,
    expectedAmount,
    paidAmount,
    balance: expectedAmount - paidAmount,
    category: row.category,
    status: statusOf(expectedAmount, paidAmount),
    note: row.note,
    paymentCount: row.payments.length,
  };
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

  const studentSelect = {
    id: true,
    firstName: true,
    lastName: true,
    guardians: {
      select: {
        guardian: {
          select: { donationNumber: true, educationNumber: true },
        },
      },
    },
  } as const;

  const students = params.classId
    ? (
        await prisma.enrollment.findMany({
          where: { classId: params.classId, status: "active" },
          select: { student: { select: studentSelect } },
          orderBy: [
            { student: { lastName: "asc" } },
            { student: { firstName: "asc" } },
          ],
        })
      ).map((enrollment) => enrollment.student)
    : await prisma.student.findMany({
        select: studentSelect,
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
      category: true,
      note: true,
      payments: { select: { amount: true } },
    },
  });
  const byStudent = new Map(donations.map((row) => [row.studentId, row]));

  const rows: DonationReportRowDTO[] = students.map((student) => {
    const existing = byStudent.get(student.id);
    const expectedAmount = existing
      ? Number(existing.expectedAmount)
      : setting.defaultAmount;
    const paidAmount = existing ? sumPayments(existing.payments) : 0;
    return {
      studentId: student.id,
      academicYearId: params.academicYearId,
      expectedAmount,
      paidAmount,
      balance: expectedAmount - paidAmount,
      category: existing?.category ?? "FULL",
      status: statusOf(expectedAmount, paidAmount),
      note: existing?.note ?? null,
      paymentCount: existing?.payments.length ?? 0,
      firstName: student.firstName,
      lastName: student.lastName,
      guardianDonationNumbers: student.guardians
        .map((link) => link.guardian.donationNumber)
        .filter((value): value is string => Boolean(value)),
      guardianEducationNumbers: student.guardians
        .map((link) => link.guardian.educationNumber)
        .filter((value): value is string => Boolean(value)),
    };
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

// Full payment history for one student: every year with an expectation, its
// payment ledger and the audit log of mutations.
export async function getStudentDonationHistory(
  studentId: string,
): Promise<StudentDonationHistoryDTO | null> {
  const [student, setting, donations, logs, currentYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true },
    }),
    getDonationSetting(),
    prisma.studentDonation.findMany({
      where: { studentId },
      orderBy: { academicYear: { name: "desc" } },
      select: {
        academicYearId: true,
        expectedAmount: true,
        category: true,
        note: true,
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        payments: {
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            amount: true,
            paidAt: true,
            note: true,
            recordedById: true,
            createdAt: true,
            recordedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.donationPaymentLog.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        academicYearId: true,
        amountBefore: true,
        amountAfter: true,
        paidAtBefore: true,
        paidAtAfter: true,
        note: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true, name: true, isCurrent: true },
    }),
  ]);

  if (!student) return null;

  const logsByYear = new Map<string, DonationPaymentLogDTO[]>();
  for (const log of logs) {
    const list = logsByYear.get(log.academicYearId) ?? [];
    list.push({
      id: log.id,
      action: log.action,
      amountBefore: log.amountBefore === null ? null : Number(log.amountBefore),
      amountAfter: log.amountAfter === null ? null : Number(log.amountAfter),
      paidAtBefore: toDateOnly(log.paidAtBefore),
      paidAtAfter: toDateOnly(log.paidAtAfter),
      note: log.note,
      actorName: log.actor?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    });
    logsByYear.set(log.academicYearId, list);
  }

  const years: DonationYearHistoryDTO[] = donations.map((row) => {
    const expectedAmount = Number(row.expectedAmount);
    const paidAmount = sumPayments(row.payments);
    return {
      academicYear: row.academicYear,
      expectedAmount,
      category: row.category,
      paidAmount,
      balance: expectedAmount - paidAmount,
      status: statusOf(expectedAmount, paidAmount),
      note: row.note,
      payments: row.payments.map(paymentDTO),
      logs: logsByYear.get(row.academicYearId) ?? [],
    };
  });

  // Always surface the current school year so a payment can be recorded even
  // before an expectation row exists (adding a payment creates it).
  if (
    currentYear &&
    !years.some((year) => year.academicYear.id === currentYear.id)
  ) {
    years.unshift({
      academicYear: currentYear,
      expectedAmount: setting.defaultAmount,
      category: setting.defaultAmount > 0 ? "FULL" : "EXEMPT",
      paidAmount: 0,
      balance: setting.defaultAmount,
      status: statusOf(setting.defaultAmount, 0),
      note: null,
      payments: [],
      logs: [],
    });
  }

  return { student, defaultAmount: setting.defaultAmount, years };
}
