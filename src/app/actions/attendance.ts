"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  assertActiveEnrollments,
  assertCanManageClass,
  requireStaff,
} from "@/lib/authorization";
import { getMeetingAttendance, type AttendanceEntryDTO } from "@/lib/attendance";
import { parseDateOnly } from "@/lib/dates";
import type { AttendanceStatus } from "@/generated/prisma/enums";

// Server Actions are public endpoints: validate input, then re-check auth and
// authorization against the database before writing.

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "VERY_LATE",
  "EXCUSED",
] as const satisfies readonly AttendanceStatus[];

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const meetingSchema = z.object({
  classId: z.string().min(1),
  sessionId: z.string().min(1),
  date: dateOnly,
});

const saveSchema = meetingSchema.extend({
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .min(1),
});

async function assertSessionBelongsToClass(
  classId: string,
  sessionId: string,
): Promise<void> {
  const link = await prisma.schoolClassSession.findUnique({
    where: { classId_sessionId: { classId, sessionId } },
    select: { id: true },
  });

  if (!link) {
    throw new Error("Session is not part of this class");
  }
}

// Upsert the roster for one class meeting. Idempotent thanks to the
// (student, class, session, date) unique key.
export async function saveAttendance(input: unknown): Promise<AttendanceEntryDTO[]> {
  const parsed = saveSchema.parse(input);
  const staff = await requireStaff();

  await assertCanManageClass(parsed.classId, staff);
  await assertSessionBelongsToClass(parsed.classId, parsed.sessionId);

  const studentIds = parsed.entries.map((entry) => entry.studentId);
  await assertActiveEnrollments(parsed.classId, studentIds);

  const date = parseDateOnly(parsed.date);

  await prisma.$transaction(
    parsed.entries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          studentId_classId_sessionId_date: {
            studentId: entry.studentId,
            classId: parsed.classId,
            sessionId: parsed.sessionId,
            date,
          },
        },
        create: {
          studentId: entry.studentId,
          classId: parsed.classId,
          sessionId: parsed.sessionId,
          date,
          status: entry.status,
          note: entry.note ?? null,
          recordedById: staff.userId,
        },
        update: {
          status: entry.status,
          note: entry.note ?? null,
          recordedById: staff.userId,
        },
      }),
    ),
  );

  return getMeetingAttendance({
    classId: parsed.classId,
    sessionId: parsed.sessionId,
    date,
  });
}

// Remove a single student's mark for a meeting (undo).
export async function deleteAttendance(input: unknown): Promise<void> {
  const parsed = meetingSchema
    .extend({ studentId: z.string().min(1) })
    .parse(input);
  const staff = await requireStaff();

  await assertCanManageClass(parsed.classId, staff);

  await prisma.attendance.deleteMany({
    where: {
      studentId: parsed.studentId,
      classId: parsed.classId,
      sessionId: parsed.sessionId,
      date: parseDateOnly(parsed.date),
    },
  });
}

// Clear every mark for a meeting (e.g. it was recorded by mistake).
export async function clearMeetingAttendance(input: unknown): Promise<void> {
  const parsed = meetingSchema.parse(input);
  const staff = await requireStaff();

  await assertCanManageClass(parsed.classId, staff);

  await prisma.attendance.deleteMany({
    where: {
      classId: parsed.classId,
      sessionId: parsed.sessionId,
      date: parseDateOnly(parsed.date),
    },
  });
}
