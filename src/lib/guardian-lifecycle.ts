import "server-only";

import type { Prisma } from "@/generated/prisma/client";

// A guardian follows their children: archived when every linked child is
// archived, active again as soon as one child is not archived. Called whenever
// a student's status changes.
export async function syncGuardianStatusesForStudents(
  tx: Prisma.TransactionClient,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;

  const links = await tx.studentGuardian.findMany({
    where: { studentId: { in: studentIds } },
    select: { guardianId: true },
  });
  const guardianIds = [...new Set(links.map((link) => link.guardianId))];

  for (const guardianId of guardianIds) {
    const [guardian, children] = await Promise.all([
      tx.guardian.findUnique({
        where: { id: guardianId },
        select: { status: true, archivedAt: true },
      }),
      tx.student.findMany({
        where: { guardians: { some: { guardianId } } },
        select: { status: true },
      }),
    ]);

    // A guardian without children keeps its current status.
    if (!guardian || children.length === 0) continue;

    const allArchived = children.every(
      (child) => child.status === "ARCHIVED",
    );

    if (allArchived) {
      if (guardian.status !== "ARCHIVED" || !guardian.archivedAt) {
        await tx.guardian.update({
          where: { id: guardianId },
          data: {
            status: "ARCHIVED",
            archivedAt: guardian.archivedAt ?? new Date(),
          },
        });
      }
    } else if (guardian.status === "ARCHIVED") {
      await tx.guardian.update({
        where: { id: guardianId },
        data: { status: "ACTIVE", archivedAt: null },
      });
    }
  }
}
