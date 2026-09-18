import "server-only";

import { requireRole } from "@/lib/dal";
import { isRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Shared authorization helpers for staff-facing Server Actions. Never trust
// role/UI checks on the client — re-verify here against the database.

export type StaffContext = { userId: string; isTeacher: boolean };

// Manager-only operations (managing lookups, staff, etc.).
export async function requireManager() {
  return requireRole("manager");
}

export async function requireStaff(): Promise<StaffContext> {
  const session = await requireRole("manager", "teacher");
  const role = session.user.role;
  return {
    userId: session.user.id,
    isTeacher: isRole(role) && role === "teacher",
  };
}

// Teachers may only manage their own classes; managers manage all.
export async function assertCanManageClass(
  classId: string,
  staff: StaffContext,
): Promise<void> {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: {
      id: classId,
      ...(staff.isTeacher ? { teacherId: staff.userId } : {}),
    },
    select: { id: true },
  });

  if (!schoolClass) {
    throw new Error("Class not found or not accessible");
  }
}

// Only actively enrolled students may be marked/graded.
export async function assertActiveEnrollments(
  classId: string,
  studentIds: string[],
): Promise<void> {
  const enrolled = await prisma.enrollment.findMany({
    where: { classId, status: "active", studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map((row) => row.studentId));

  const unknown = studentIds.filter((id) => !enrolledIds.has(id));
  if (unknown.length > 0) {
    throw new Error(`Not actively enrolled in this class: ${unknown.join(", ")}`);
  }
}
