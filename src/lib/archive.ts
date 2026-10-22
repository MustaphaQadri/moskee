import "server-only";

import { prisma } from "@/lib/prisma";
import { addMonths, todayDateOnly } from "@/lib/dates";
import {
  DEFAULT_ARCHIVE_RETENTION_MONTHS,
  getRegistrationSetting,
} from "@/lib/registration";

// Permanent cleanup of archived students/guardians whose retention period has
// passed. Student deletion cascades enrollments, attendance, grades, donations
// and report observations; guardian deletion cascades the links, comments and
// registration tokens.

export type PurgeResult = {
  students: number;
  guardians: number;
};

export async function purgeExpiredArchived(): Promise<PurgeResult> {
  const { archiveRetentionMonths } = await getRegistrationSetting();
  const months = Math.max(
    1,
    archiveRetentionMonths || DEFAULT_ARCHIVE_RETENTION_MONTHS,
  );
  const cutoff = addMonths(todayDateOnly(), -months);

  const [students, guardians] = await prisma.$transaction([
    prisma.student.deleteMany({
      where: {
        status: "ARCHIVED",
        archivedAt: { not: null, lte: cutoff },
      },
    }),
    prisma.guardian.deleteMany({
      where: {
        status: "ARCHIVED",
        archivedAt: { not: null, lte: cutoff },
      },
    }),
  ]);

  return {
    students: students.count,
    guardians: guardians.count,
  };
}
