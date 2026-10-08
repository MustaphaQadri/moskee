"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertCanManageClass, requireStaff } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";

// Report observations are free text the teacher leaves for a student on a
// report. Server Actions are public endpoints: validate input, re-check auth and
// authorization, then upsert.

const bodySchema = z.string().trim().max(2000, "Maximaal 2000 tekens");

const periodSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  body: bodySchema,
});

const yearSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  body: bodySchema,
});

async function assertEnrolled(classId: string, studentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { classId, studentId, status: "active" },
    select: { id: true },
  });
  if (!enrollment) {
    throw new ActionError("Leerling is niet actief in deze klas");
  }
}

function revalidateReport(classId: string): void {
  revalidatePath(`/dashboard/classes/${classId}/grades`);
}

export async function savePeriodReportObservation(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = periodSchema.parse(input);
    const staff = await requireStaff();
    await assertCanManageClass(parsed.classId, staff);
    await assertEnrolled(parsed.classId, parsed.studentId);

    const [term, academicYear] = await Promise.all([
      prisma.term.findUnique({ where: { id: parsed.termId }, select: { id: true } }),
      prisma.academicYear.findUnique({
        where: { id: parsed.academicYearId },
        select: { id: true },
      }),
    ]);
    if (!term) throw new ActionError("Periode niet gevonden");
    if (!academicYear) throw new ActionError("Schooljaar niet gevonden");

    if (parsed.body.length === 0) {
      await prisma.periodReportObservation.deleteMany({
        where: {
          studentId: parsed.studentId,
          termId: parsed.termId,
          academicYearId: parsed.academicYearId,
        },
      });
    } else {
      await prisma.periodReportObservation.upsert({
        where: {
          studentId_termId_academicYearId: {
            studentId: parsed.studentId,
            termId: parsed.termId,
            academicYearId: parsed.academicYearId,
          },
        },
        create: {
          studentId: parsed.studentId,
          termId: parsed.termId,
          academicYearId: parsed.academicYearId,
          body: parsed.body,
          recordedById: staff.userId,
        },
        update: { body: parsed.body, recordedById: staff.userId },
      });
    }

    revalidateReport(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveYearReportObservation(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = yearSchema.parse(input);
    const staff = await requireStaff();
    await assertCanManageClass(parsed.classId, staff);
    await assertEnrolled(parsed.classId, parsed.studentId);

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: parsed.academicYearId },
      select: { id: true },
    });
    if (!academicYear) throw new ActionError("Schooljaar niet gevonden");

    if (parsed.body.length === 0) {
      await prisma.yearReportObservation.deleteMany({
        where: {
          studentId: parsed.studentId,
          academicYearId: parsed.academicYearId,
        },
      });
    } else {
      await prisma.yearReportObservation.upsert({
        where: {
          studentId_academicYearId: {
            studentId: parsed.studentId,
            academicYearId: parsed.academicYearId,
          },
        },
        create: {
          studentId: parsed.studentId,
          academicYearId: parsed.academicYearId,
          body: parsed.body,
          recordedById: staff.userId,
        },
        update: { body: parsed.body, recordedById: staff.userId },
      });
    }

    revalidateReport(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
