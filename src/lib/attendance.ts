import "server-only";

import { prisma } from "@/lib/prisma";
import { parseDateOnly, toDateOnly } from "@/lib/dates";
import type { AttendanceStatus } from "@/generated/prisma/enums";

// Data access for attendance (presence per student, class, session, date).
// Server-only: import these in Server Components / Server Actions, never in
// Client Components. Return DTOs (only the fields the client needs).

export type RosterStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
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

export type StudentAttendanceRecordDTO = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  status: AttendanceStatus;
  note: string | null;
  className: string;
  sessionLabel: string;
};

export type StudentAttendanceDTO = {
  summary: AttendanceSummaryDTO;
  // Every meeting where the student was NOT present (late/very late/absent/excused).
  records: StudentAttendanceRecordDTO[];
};

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "VERY_LATE",
  "EXCUSED",
] as const satisfies readonly AttendanceStatus[];

// Statuses that count as "was present" for presence rates.
const PRESENT_STATUSES = new Set<AttendanceStatus>([
  "PRESENT",
  "LATE",
  "VERY_LATE",
]);

const DAY_INDEX: Record<string, number> = {
  Zondag: 0,
  Maandag: 1,
  Dinsdag: 2,
  Woensdag: 3,
  Donderdag: 4,
  Vrijdag: 5,
  Zaterdag: 6,
};

// The date (yyyy-mm-dd) of the weekday named `day` closest to `fromIso` — the
// same day when it matches, otherwise the nearest occurrence (past or future).
export function nearestDateForDay(day: string | null, fromIso: string): string {
  if (!day || !(day in DAY_INDEX)) return fromIso;

  const from = parseDateOnly(fromIso);
  const fromDay = from.getUTCDay();
  const target = DAY_INDEX[day];

  const forward = (target - fromDay + 7) % 7;
  const backward = (fromDay - target + 7) % 7;
  const offset = forward <= backward ? forward : -backward;

  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + offset);
  return toDateOnly(date) ?? fromIso;
}

// Students who can be marked: active enrollments in the class.
export async function getClassRoster(
  classId: string,
): Promise<RosterStudentDTO[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: "active" },
    select: {
      student: {
        select: { id: true, firstName: true, lastName: true, image: true },
      },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return enrollments.map((enrollment) => ({
    studentId: enrollment.student.id,
    firstName: enrollment.student.firstName,
    lastName: enrollment.student.lastName,
    image: enrollment.student.image,
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
// count (PRESENT + LATE + VERY_LATE) and the total number of marks recorded.
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
    if (PRESENT_STATUSES.has(group.status)) {
      meeting.presentCount += count;
    }
    meetings.set(key, meeting);
  }

  return [...meetings.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export type AttendanceRange = { from: Date; to: Date };

// Per-student totals across all classes (or within a date range), one entry per
// status.
export async function getStudentAttendanceSummary(
  studentId: string,
  range?: AttendanceRange,
): Promise<AttendanceSummaryDTO> {
  const groups = await prisma.attendance.groupBy({
    by: ["status"],
    where: {
      studentId,
      ...(range ? { date: { gte: range.from, lte: range.to } } : {}),
    },
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

// A student's attendance breakdown (per status) plus every non-present meeting,
// optionally scoped to a date range (e.g. one period).
export async function getStudentAttendanceDetail(
  studentId: string,
  range?: AttendanceRange,
): Promise<StudentAttendanceDTO> {
  const [summary, records] = await Promise.all([
    getStudentAttendanceSummary(studentId, range),
    prisma.attendance.findMany({
      where: {
        studentId,
        status: { not: "PRESENT" },
        ...(range ? { date: { gte: range.from, lte: range.to } } : {}),
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        status: true,
        note: true,
        class: { select: { name: true } },
        session: { select: { label: true } },
      },
    }),
  ]);

  return {
    summary,
    records: records.map((record) => ({
      id: record.id,
      date: toDateOnly(record.date) ?? "",
      status: record.status,
      note: record.note,
      className: record.class.name,
      sessionLabel: record.session.label,
    })),
  };
}
