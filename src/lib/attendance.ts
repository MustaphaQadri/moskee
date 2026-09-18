import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import type { AttendanceStatus } from "@/generated/prisma/enums";

// Data access for attendance (presence per student, class, session, date).
// Server-only: import these in Server Components / Server Actions, never in
// Client Components. Return DTOs (only the fields the client needs).

export type RosterStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
};

export type AttendanceEntryDTO = {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  recordedById: string | null;
};

export type ClassMeetingDTO = {
  sessionId: string;
  date: string; // ISO yyyy-mm-dd
  presentCount: number;
  totalCount: number;
};

export type AttendanceSummaryDTO = Record<AttendanceStatus, number> & {
  total: number;
};

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const satisfies readonly AttendanceStatus[];

// Students who can be marked: active enrollments in the class.
export async function getClassRoster(
  classId: string,
): Promise<RosterStudentDTO[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: "active" },
    select: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return enrollments.map((enrollment) => ({
    studentId: enrollment.student.id,
    firstName: enrollment.student.firstName,
    lastName: enrollment.student.lastName,
  }));
}

// Existing marks for one class meeting (class + session slot + date).
export async function getMeetingAttendance(params: {
  classId: string;
  sessionId: string;
  date: Date;
}): Promise<AttendanceEntryDTO[]> {
  const rows = await prisma.attendance.findMany({
    where: {
      classId: params.classId,
      sessionId: params.sessionId,
      date: params.date,
    },
    select: { studentId: true, status: true, note: true, recordedById: true },
  });

  return rows;
}

// Distinct meetings (session slot + date) held for a class, with a presence
// count (PRESENT + LATE) and the total number of marks recorded.
export async function listClassMeetings(
  classId: string,
): Promise<ClassMeetingDTO[]> {
  const groups = await prisma.attendance.groupBy({
    by: ["sessionId", "date", "status"],
    where: { classId },
    _count: { _all: true },
  });

  const meetings = new Map<string, ClassMeetingDTO>();
  for (const group of groups) {
    const date = toDateOnly(group.date) ?? "";
    const key = `${group.sessionId}|${date}`;
    const meeting =
      meetings.get(key) ??
      { sessionId: group.sessionId, date, presentCount: 0, totalCount: 0 };

    const count = group._count._all;
    meeting.totalCount += count;
    if (group.status === "PRESENT" || group.status === "LATE") {
      meeting.presentCount += count;
    }
    meetings.set(key, meeting);
  }

  return [...meetings.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// Per-student totals across all classes, one entry per status.
export async function getStudentAttendanceSummary(
  studentId: string,
): Promise<AttendanceSummaryDTO> {
  const groups = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId },
    _count: { _all: true },
  });

  const summary = Object.fromEntries(
    ATTENDANCE_STATUSES.map((status) => [status, 0]),
  ) as Record<AttendanceStatus, number>;
  let total = 0;

  for (const group of groups) {
    summary[group.status] = group._count._all;
    total += group._count._all;
  }

  return { ...summary, total };
}
