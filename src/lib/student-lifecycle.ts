import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { StudentStatus } from "@/generated/prisma/enums";

// Shared student lifecycle transitions. `archivedAt` is the soft-delete date:
// set when a student becomes ARCHIVED and cleared when they become active again
// (or return to the waiting list).

export async function setStudentStatus(
  tx: Prisma.TransactionClient,
  studentId: string,
  toStatus: StudentStatus,
  actorId: string,
  note?: string,
): Promise<void> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { status: true, archivedAt: true },
  });
  if (!student) return;

  if (student.status === toStatus) {
    // Repair archived rows created before the archive date existed.
    if (toStatus === "ARCHIVED" && !student.archivedAt) {
      await tx.student.update({
        where: { id: studentId },
        data: { archivedAt: new Date() },
      });
    }
    return;
  }

  await tx.student.update({
    where: { id: studentId },
    data: {
      status: toStatus,
      archivedAt: toStatus === "ARCHIVED" ? new Date() : null,
    },
  });

  await tx.studentStatusEvent.create({
    data: {
      studentId,
      fromStatus: student.status,
      toStatus,
      changedById: actorId,
      note: note ?? null,
    },
  });
}

// Ends every active class enrollment for the given students.
export async function withdrawActiveEnrollments(
  tx: Prisma.TransactionClient,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;

  await tx.enrollment.updateMany({
    where: { studentId: { in: studentIds }, status: "active" },
    data: { status: "withdrawn", endDate: new Date() },
  });
}
