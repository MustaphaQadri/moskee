import "server-only";

import { prisma } from "@/lib/prisma";
import { getDonationReport } from "@/lib/donations";

// Read side of the manager dashboard. Server-only.

export type DonationDashboardSummaryDTO = {
  academicYear: { id: string; name: string };
  paidAmount: number;
  partialAmount: number;
  unpaidAmount: number;
  requiredAmount: number;
  requiredCount: number;
  exemptCount: number;
};

// Expected amounts of students who still have to pay, grouped by payment
// status. Exempt students (expected 0) are excluded from the amounts and
// reported as a count. Archived students who still owe are included.
export async function getDonationDashboardSummary(): Promise<DonationDashboardSummaryDTO | null> {
  const academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  });
  if (!academicYear) return null;

  const report = await getDonationReport({ academicYearId: academicYear.id });
  if (!report) return null;

  let paidAmount = 0;
  let partialAmount = 0;
  let unpaidAmount = 0;
  let requiredCount = 0;
  let exemptCount = 0;

  for (const row of report.rows) {
    if (row.expectedAmount <= 0) {
      exemptCount += 1;
      continue;
    }

    requiredCount += 1;
    if (row.status === "PAID") paidAmount += row.expectedAmount;
    else if (row.status === "PARTIAL") partialAmount += row.expectedAmount;
    else if (row.status === "UNPAID") unpaidAmount += row.expectedAmount;
  }

  return {
    academicYear,
    paidAmount,
    partialAmount,
    unpaidAmount,
    requiredAmount: paidAmount + partialAmount + unpaidAmount,
    requiredCount,
    exemptCount,
  };
}

export type StudentGenderDistributionDTO = {
  total: number;
  male: number;
  female: number;
  unknown: number;
};

// Non-archived students by sex. `unknown` covers students without a sex value.
export async function getStudentGenderDistribution(): Promise<StudentGenderDistributionDTO> {
  const groups = await prisma.student.groupBy({
    by: ["sex"],
    where: { status: { not: "ARCHIVED" } },
    _count: { _all: true },
  });

  let male = 0;
  let female = 0;
  let unknown = 0;

  for (const group of groups) {
    if (group.sex === "MALE") male = group._count._all;
    else if (group.sex === "FEMALE") female = group._count._all;
    else unknown += group._count._all;
  }

  return {
    total: male + female + unknown,
    male,
    female,
    unknown,
  };
}

export type StudentLevelDistributionDTO = {
  total: number;
  levels: { id: string; name: string; count: number }[];
  unassigned: number;
  waitingList: number;
};

// Non-archived students grouped by the level of their active class. Students
// without an active class are split into the waiting list and "niet ingedeeld".
export async function getStudentLevelDistribution(): Promise<StudentLevelDistributionDTO> {
  const [levels, students] = await Promise.all([
    prisma.level.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.student.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        status: true,
        enrollments: {
          where: { status: "active" },
          take: 1,
          select: { class: { select: { levelId: true } } },
        },
      },
    }),
  ]);

  const counts = new Map(levels.map((level) => [level.id, 0]));
  let unassigned = 0;
  let waitingList = 0;

  for (const student of students) {
    const levelId = student.enrollments[0]?.class.levelId;
    if (levelId && counts.has(levelId)) {
      counts.set(levelId, (counts.get(levelId) ?? 0) + 1);
    } else if (student.status === "WAITING_LIST") {
      waitingList += 1;
    } else {
      unassigned += 1;
    }
  }

  return {
    total: students.length,
    levels: levels.map((level) => ({
      id: level.id,
      name: level.name,
      count: counts.get(level.id) ?? 0,
    })),
    unassigned,
    waitingList,
  };
}
